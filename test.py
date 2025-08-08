import requests
import json
import concurrent.futures

def send_request():
    url = 'http://localhost:5000/add'
    headers = {'Content-Type': 'application/json'}
    data = {'x': 5, 'y': 3}
    response = requests.post(url, headers=headers, json=data)
    return response.json()

# 10000 eşzamanlı istek gönder
with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
    # 20 thread ile 100 istek gönderiyoruz
    futures = [executor.submit(send_request) for _ in range(10000)]
    results = [future.result() for future in concurrent.futures.as_completed(futures)]

print(f"Toplam {len(results)} istek gönderildi.")