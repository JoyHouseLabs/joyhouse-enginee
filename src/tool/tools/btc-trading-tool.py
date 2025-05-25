#!/usr/bin/env python3
"""
BTC交易执行工具
模拟BTC买入和卖出操作（实际使用时需要连接真实交易所API）
"""

import json
import time
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

class BTCTradingService:
    """BTC交易服务类"""
    
    def __init__(self):
        self.trading_enabled = True
        self.demo_mode = True  # 演示模式，不执行真实交易
        self.balance = {
            'usd': 10000.0,  # 模拟USD余额
            'btc': 0.0       # 模拟BTC余额
        }
        self.trading_fee = 0.001  # 0.1% 交易手续费
        
    def get_balance(self) -> Dict[str, Any]:
        """获取账户余额"""
        return {
            'success': True,
            'balance': self.balance.copy(),
            'timestamp': datetime.now().isoformat()
        }
    
    def validate_buy_order(self, amount_usd: float, btc_price: float) -> Dict[str, Any]:
        """验证买入订单"""
        if not self.trading_enabled:
            return {'valid': False, 'error': 'Trading is disabled'}
        
        if amount_usd <= 0:
            return {'valid': False, 'error': 'Invalid amount'}
        
        if btc_price <= 0:
            return {'valid': False, 'error': 'Invalid BTC price'}
        
        total_cost = amount_usd * (1 + self.trading_fee)
        if total_cost > self.balance['usd']:
            return {
                'valid': False, 
                'error': f'Insufficient USD balance. Required: ${total_cost:.2f}, Available: ${self.balance["usd"]:.2f}'
            }
        
        btc_amount = amount_usd / btc_price
        return {
            'valid': True,
            'btc_amount': btc_amount,
            'total_cost': total_cost,
            'fee': amount_usd * self.trading_fee
        }
    
    def validate_sell_order(self, btc_amount: float, btc_price: float) -> Dict[str, Any]:
        """验证卖出订单"""
        if not self.trading_enabled:
            return {'valid': False, 'error': 'Trading is disabled'}
        
        if btc_amount <= 0:
            return {'valid': False, 'error': 'Invalid BTC amount'}
        
        if btc_price <= 0:
            return {'valid': False, 'error': 'Invalid BTC price'}
        
        if btc_amount > self.balance['btc']:
            return {
                'valid': False,
                'error': f'Insufficient BTC balance. Required: {btc_amount:.8f}, Available: {self.balance["btc"]:.8f}'
            }
        
        usd_amount = btc_amount * btc_price
        fee = usd_amount * self.trading_fee
        net_usd = usd_amount - fee
        
        return {
            'valid': True,
            'usd_amount': usd_amount,
            'net_usd': net_usd,
            'fee': fee
        }
    
    def execute_buy_order(self, amount_usd: float, btc_price: float, order_type: str = 'market') -> Dict[str, Any]:
        """执行买入订单"""
        validation = self.validate_buy_order(amount_usd, btc_price)
        if not validation['valid']:
            return {
                'success': False,
                'error': validation['error'],
                'timestamp': datetime.now().isoformat()
            }
        
        order_id = str(uuid.uuid4())
        btc_amount = validation['btc_amount']
        total_cost = validation['total_cost']
        fee = validation['fee']
        
        if self.demo_mode:
            # 模拟交易执行
            self.balance['usd'] -= total_cost
            self.balance['btc'] += btc_amount
            
            return {
                'success': True,
                'order_id': order_id,
                'order_type': order_type,
                'action': 'buy',
                'btc_amount': round(btc_amount, 8),
                'usd_amount': amount_usd,
                'btc_price': btc_price,
                'fee': round(fee, 2),
                'total_cost': round(total_cost, 2),
                'executed_at': datetime.now().isoformat(),
                'status': 'filled',
                'demo_mode': True,
                'new_balance': self.balance.copy()
            }
        else:
            # 这里应该调用真实的交易所API
            return {
                'success': False,
                'error': 'Real trading not implemented. Set demo_mode=True for simulation.',
                'timestamp': datetime.now().isoformat()
            }
    
    def execute_sell_order(self, btc_amount: float, btc_price: float, order_type: str = 'market') -> Dict[str, Any]:
        """执行卖出订单"""
        validation = self.validate_sell_order(btc_amount, btc_price)
        if not validation['valid']:
            return {
                'success': False,
                'error': validation['error'],
                'timestamp': datetime.now().isoformat()
            }
        
        order_id = str(uuid.uuid4())
        usd_amount = validation['usd_amount']
        net_usd = validation['net_usd']
        fee = validation['fee']
        
        if self.demo_mode:
            # 模拟交易执行
            self.balance['btc'] -= btc_amount
            self.balance['usd'] += net_usd
            
            return {
                'success': True,
                'order_id': order_id,
                'order_type': order_type,
                'action': 'sell',
                'btc_amount': round(btc_amount, 8),
                'usd_amount': round(usd_amount, 2),
                'net_usd': round(net_usd, 2),
                'btc_price': btc_price,
                'fee': round(fee, 2),
                'executed_at': datetime.now().isoformat(),
                'status': 'filled',
                'demo_mode': True,
                'new_balance': self.balance.copy()
            }
        else:
            # 这里应该调用真实的交易所API
            return {
                'success': False,
                'error': 'Real trading not implemented. Set demo_mode=True for simulation.',
                'timestamp': datetime.now().isoformat()
            }
    
    def get_order_history(self, limit: int = 10) -> Dict[str, Any]:
        """获取订单历史（模拟）"""
        # 在实际实现中，这里应该从数据库或交易所API获取历史订单
        return {
            'success': True,
            'orders': [],
            'message': 'Order history not implemented in demo mode',
            'timestamp': datetime.now().isoformat()
        }
    
    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """取消订单（模拟）"""
        return {
            'success': True,
            'order_id': order_id,
            'status': 'cancelled',
            'message': 'Order cancellation not implemented in demo mode',
            'timestamp': datetime.now().isoformat()
        }

def main():
    """主函数 - 命令行接口"""
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='BTC Trading Tool')
    parser.add_argument('action', choices=['buy', 'sell', 'balance', 'history'], help='Trading action')
    parser.add_argument('--amount', type=float, help='Amount to trade (USD for buy, BTC for sell)')
    parser.add_argument('--price', type=float, help='BTC price')
    parser.add_argument('--btc-amount', type=float, help='BTC amount for sell orders')
    parser.add_argument('--order-type', default='market', choices=['market', 'limit'], help='Order type')
    
    args = parser.parse_args()
    
    service = BTCTradingService()
    
    if args.action == 'balance':
        result = service.get_balance()
    elif args.action == 'history':
        result = service.get_order_history()
    elif args.action == 'buy':
        if not args.amount or not args.price:
            result = {'error': 'Buy order requires --amount and --price'}
        else:
            result = service.execute_buy_order(args.amount, args.price, args.order_type)
    elif args.action == 'sell':
        if not args.price:
            result = {'error': 'Sell order requires --price'}
        else:
            btc_amount = args.btc_amount or args.amount
            if not btc_amount:
                result = {'error': 'Sell order requires --btc-amount or --amount'}
            else:
                result = service.execute_sell_order(btc_amount, args.price, args.order_type)
    else:
        result = {'error': f'Unknown action: {args.action}'}
    
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main() 