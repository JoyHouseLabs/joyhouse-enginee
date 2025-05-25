#!/usr/bin/env python3
"""
BTC价格查询工具
从多个数据源获取实时BTC价格信息
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class BTCPriceService:
    """BTC价格服务类"""
    
    def __init__(self):
        self.sources = {
            'coingecko': {
                'url': 'https://api.coingecko.com/api/v3/simple/price',
                'params': {
                    'ids': 'bitcoin',
                    'vs_currencies': 'usd',
                    'include_24hr_change': 'true',
                    'include_24hr_vol': 'true',
                    'include_last_updated_at': 'true'
                }
            },
            'binance': {
                'url': 'https://api.binance.com/api/v3/ticker/24hr',
                'params': {'symbol': 'BTCUSDT'}
            },
            'coinbase': {
                'url': 'https://api.coinbase.com/v2/exchange-rates',
                'params': {'currency': 'BTC'}
            }
        }
    
    def get_price_from_coingecko(self) -> Optional[Dict[str, Any]]:
        """从CoinGecko获取BTC价格"""
        try:
            response = requests.get(
                self.sources['coingecko']['url'],
                params=self.sources['coingecko']['params'],
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            bitcoin_data = data.get('bitcoin', {})
            return {
                'source': 'coingecko',
                'price': bitcoin_data.get('usd'),
                'change_24h': bitcoin_data.get('usd_24h_change'),
                'volume_24h': bitcoin_data.get('usd_24h_vol'),
                'last_updated': bitcoin_data.get('last_updated_at'),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"CoinGecko API error: {e}")
            return None
    
    def get_price_from_binance(self) -> Optional[Dict[str, Any]]:
        """从Binance获取BTC价格"""
        try:
            response = requests.get(
                self.sources['binance']['url'],
                params=self.sources['binance']['params'],
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                'source': 'binance',
                'price': float(data.get('lastPrice', 0)),
                'change_24h': float(data.get('priceChangePercent', 0)),
                'volume_24h': float(data.get('volume', 0)),
                'high_24h': float(data.get('highPrice', 0)),
                'low_24h': float(data.get('lowPrice', 0)),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Binance API error: {e}")
            return None
    
    def get_price_from_coinbase(self) -> Optional[Dict[str, Any]]:
        """从Coinbase获取BTC价格"""
        try:
            response = requests.get(
                self.sources['coinbase']['url'],
                params=self.sources['coinbase']['params'],
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            rates = data.get('data', {}).get('rates', {})
            usd_rate = rates.get('USD')
            
            if usd_rate:
                price = 1 / float(usd_rate)  # BTC价格 = 1 / (USD/BTC汇率)
                return {
                    'source': 'coinbase',
                    'price': price,
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            print(f"Coinbase API error: {e}")
            return None
    
    def get_aggregated_price(self) -> Dict[str, Any]:
        """获取聚合的BTC价格数据"""
        prices = []
        sources_data = {}
        
        # 从多个源获取价格
        coingecko_data = self.get_price_from_coingecko()
        if coingecko_data and coingecko_data['price']:
            prices.append(coingecko_data['price'])
            sources_data['coingecko'] = coingecko_data
        
        binance_data = self.get_price_from_binance()
        if binance_data and binance_data['price']:
            prices.append(binance_data['price'])
            sources_data['binance'] = binance_data
        
        coinbase_data = self.get_price_from_coinbase()
        if coinbase_data and coinbase_data['price']:
            prices.append(coinbase_data['price'])
            sources_data['coinbase'] = coinbase_data
        
        if not prices:
            return {
                'success': False,
                'error': 'Unable to fetch price from any source',
                'timestamp': datetime.now().isoformat()
            }
        
        # 计算平均价格
        avg_price = sum(prices) / len(prices)
        
        # 使用CoinGecko的额外数据（如果可用）
        primary_data = coingecko_data or binance_data or coinbase_data
        
        result = {
            'success': True,
            'price': round(avg_price, 2),
            'price_sources': len(prices),
            'change_24h': primary_data.get('change_24h', 0) if primary_data else 0,
            'volume_24h': primary_data.get('volume_24h', 0) if primary_data else 0,
            'high_24h': binance_data.get('high_24h', 0) if binance_data else 0,
            'low_24h': binance_data.get('low_24h', 0) if binance_data else 0,
            'timestamp': datetime.now().isoformat(),
            'sources': sources_data,
            'price_variance': max(prices) - min(prices) if len(prices) > 1 else 0
        }
        
        return result

def main():
    """主函数 - 命令行接口"""
    import sys
    
    service = BTCPriceService()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--source':
        # 指定数据源
        source = sys.argv[2] if len(sys.argv) > 2 else 'coingecko'
        if source == 'coingecko':
            result = service.get_price_from_coingecko()
        elif source == 'binance':
            result = service.get_price_from_binance()
        elif source == 'coinbase':
            result = service.get_price_from_coinbase()
        else:
            result = {'error': f'Unknown source: {source}'}
    else:
        # 获取聚合价格
        result = service.get_aggregated_price()
    
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main() 