import requests

BASE_URL = 'http://localhost:1666/api'

# 1. 注册
register_data = {
    'username': 'testuser123',
    'password': 'testpass123',
    'nickname': '测试用户'
}
r = requests.post(f'{BASE_URL}/auth/register', json=register_data)
print('注册:', r.status_code, r.json())

# 2. 登录
login_data = {
    'username': 'testuser123',
    'password': 'testpass123'
}
r = requests.post(f'{BASE_URL}/auth/login', json=login_data)
print('登录:', r.status_code, r.json())
assert r.status_code == 200  or r.status_code == 201
token = r.json()['token'] if 'token' in r.json() else r.json().get('data', {}).get('token')
headers = {'Authorization': f'Bearer {token}'}

# 3. 获取当前用户信息
r = requests.get(f'{BASE_URL}/users/me', headers=headers)
print('当前用户信息:', r.status_code, r.json())

# 4. 设置用户属性（如昵称）
set_property_data = {
    'nickname': '新昵称',
    'avatar': 'https://example.com/avatar.png'
}
r = requests.post(f'{BASE_URL}/users/set-property', headers=headers, json=set_property_data)
print('设置用户属性:', r.status_code, r.json())

# 5. 再次获取用户信息，验证属性是否更新
r = requests.get(f'{BASE_URL}/users/me', headers=headers)
print('获取用户信息(更新后):', r.status_code, r.json())

# 6. 修改密码
change_password_data = {
    'oldPassword': 'testpass123',
    'newPassword': 'testpass456'
}
r = requests.post(f'{BASE_URL}/users/password', headers=headers, json=change_password_data)
print('修改密码:', r.status_code, r.json())

# 7. 用新密码重新登录
login_data_new = {
    'username': 'testuser123',
    'password': 'testpass456'
}
r = requests.post(f'{BASE_URL}/auth/login', json=login_data_new)
print('用新密码登录:', r.status_code, r.json())

# 8. 用旧密码登录（应失败）
login_data_old = {
    'username': 'testuser123',
    'password': 'testpass123'
}
r = requests.post(f'{BASE_URL}/auth/login', json=login_data_old)
print('用旧密码登录（应失败）:', r.status_code, r.json())

# 你可以继续添加更多接口测试，如知识库创建、文件上传等。
