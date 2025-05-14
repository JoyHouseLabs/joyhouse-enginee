import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { encrypt, decrypt } from './crypto.util';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async createWalletForUser(userId: string, password: string, mainchain: 'sol' | 'evm' = 'evm') {
    let address = '';
    let pubKey = '';
    let privKeyRaw = '';
    let seedRaw = '';

    if (mainchain === 'evm') {
      // EVM钱包用 ethers
      const { ethers } = await import('ethers');
      const wallet = ethers.Wallet.createRandom();
      address = wallet.address;
      pubKey = wallet.publicKey;
      privKeyRaw = wallet.privateKey;
      seedRaw = wallet.mnemonic?.phrase || '';
    } else if (mainchain === 'sol') {
      // Solana钱包用 @solana/web3.js
      const solanaWeb3 = await import('@solana/web3.js');
      const kp = solanaWeb3.Keypair.generate();
      address = kp.publicKey.toBase58();
      pubKey = kp.publicKey.toBase58();
      privKeyRaw = Buffer.from(kp.secretKey).toString('hex');
      seedRaw = ''; // Solana不直接暴露助记词，可扩展
    }

    const encPriv = encrypt(privKeyRaw, password);
    const encSeed = encrypt(seedRaw, password);

    const wallet = this.walletRepo.create({
      mainchain,
      address,
      pubKey,
      privateKey: JSON.stringify(encPriv),
      seed: JSON.stringify(encSeed),
      userId,
    });
    return this.walletRepo.save(wallet);
  }

  async decryptWallet(wallet: Wallet, password: string) {
    const privKey = decrypt(JSON.parse(wallet.privateKey), password);
    const seed = decrypt(JSON.parse(wallet.seed), password);
    return { ...wallet, privateKey: privKey, seed };
  }

  async updatePassword(wallet: Wallet, oldPassword: string, newPassword: string) {
    const privKey = decrypt(JSON.parse(wallet.privateKey), oldPassword);
    const seed = decrypt(JSON.parse(wallet.seed), oldPassword);
    const newEncPriv = encrypt(privKey, newPassword);
    const newEncSeed = encrypt(seed, newPassword);
    wallet.privateKey = JSON.stringify(newEncPriv);
    wallet.seed = JSON.stringify(newEncSeed);
    return this.walletRepo.save(wallet);
  }

  async findByUserId(userId: string, mainchain: string): Promise<Wallet | null> {
    return this.walletRepo.findOneBy({ userId, mainchain });
  }

  /**
   * Verify signature for both EVM and Solana wallets
   * @param mainchain 'evm' | 'sol'
   * @param address Wallet address
   * @param message Original message
   * @param sign Signature (hex for evm, base58 for sol)
   * @param ts Timestamp
   * @returns boolean (valid or not)
   */
  async verifySignature(params: {
    mainchain: 'evm' | 'sol',
    address: string,
    message: string,
    sign: string,
    ts: number|string
  }): Promise<boolean> {
    const { mainchain, address, message, sign } = params;
    if (mainchain === 'evm') {
      // ethers.js v6+ signature verification
      const { verifyMessage, getAddress } = await import('ethers');
      try {
        const recovered = verifyMessage(message, sign);
        return getAddress(recovered) === getAddress(address);
      } catch (e) {
        return false;
      }
    } else if (mainchain === 'sol') {
      // solana/web3.js signature verification
      const solanaWeb3 = await import('@solana/web3.js');
      try {
        const pubKey = new solanaWeb3.PublicKey(address);
        // Use bs58 to decode signature
        let bs58;
        try {
          bs58 = (await import('bs58')).default;
        } catch (e) {
          throw new Error('请先安装 bs58 依赖包: npm install bs58');
        }
        const signature = bs58.decode(sign);
        const msgBuf = Buffer.from(message);
        // Use nacl.sign.detached.verify for Solana signature verification
        const nacl = (await import('tweetnacl')).default;
        return nacl.sign.detached.verify(msgBuf, signature, pubKey.toBytes());

      } catch (e) {
        return false;
      }
    }
    return false;
  }
}
