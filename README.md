# CyberLens - Web Tabanlı Siber Güvenlik Araçları Platformu

## 📋 Proje Hakkında

CyberLens, siber güvenlik uzmanları ve araştırmacıları için geliştirilmiş web tabanlı bir platformdur. Bu platform, popüler siber güvenlik araçlarını (Nmap, Katana, Whois, Nikto) tek bir arayüzden kullanmanıza olanak tanır. React frontend ve Flask backend ile geliştirilmiş, Docker container'ları ile çalışan modern bir mimari kullanmaktadır.

## �️ Arayüz Görünümü

![CyberLens UI](ui.png)

## �🚀 Özellikler

- **Web Crawling**: Katana ile web sitesi tarama
- **Port Scanning**: Nmap ile ağ keşfi ve port taraması
- **Domain Intelligence**: Whois ile domain bilgi sorgulama
- **Kullanıcı Authentication**: Firebase ile güvenli giriş sistemi
- **Geçmiş Takibi**: Tüm işlemlerin kaydedilmesi ve görüntülenmesi
- **Real-time Results**: Celery ile asenkron görev işleme
- **Responsive Design**: Material-UI ile modern arayüz

## 🛠️ Kullanılan Teknolojiler

### Frontend
- **React 19** - Modern UI framework
- **Vite** - Hızlı build tool
- **Material-UI (MUI)** - Component library
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Firebase Auth** - Authentication sistemi

### Backend
- **Flask** - Python web framework
- **Celery** - Asenkron görev kuyruğu
- **PostgreSQL** - Ana veritabanı
- **RabbitMQ** - Message broker
- **SQLAlchemy** - ORM
- **Flask-CORS** - Cross-origin resource sharing

### DevOps & Tools
- **Docker & Docker Compose** - Container orchestration
- **Nmap** - Network discovery ve security auditing
- **Katana** - Web crawler (ProjectDiscovery)
- **Whois** - Domain information lookup
- **Flower** - Celery monitoring
- **pgAdmin** - PostgreSQL yönetimi

## 📦 Kurulum

### Gereksinimler
- Docker
- Docker Compose
- Git

### Adım Adım Kurulum

1. **Projeyi klonlayın:**
```bash
git clone https://github.com/melih-akman/s4e-staj.git
cd s4e-staj
```

2. **Firebase konfigürasyonu:**
   
   `viteTailMui` klasöründe `.env` dosyası oluşturun:
```env
VITE_API_KEY=your_firebase_api_key
VITE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_PROJECT_ID=your_project_id
VITE_STORAGE_BUCKET=your_project.appspot.com
VITE_MESSAGING_SENDER_ID=your_sender_id
VITE_APP_ID=your_app_id
```

3. **Docker container'ları başlatın:**
```bash
docker-compose up -d
```

4. **Servislerin hazır olmasını bekleyin** (yaklaşık 2-3 dakika)

## 🔧 Servis Portları ve Erişim Bilgileri

### Ana Servisler
| Servis | Port | URL | Açıklama |
|--------|------|-----|-----------|
| **Frontend (React)** | 5173 | http://localhost:5173 | Ana web arayüzü |
| **Backend API (Flask)** | 5000 | http://localhost:5000 | REST API |

### Veritabanı ve Monitoring
| Servis | Port | URL | Kullanıcı Adı | Şifre |
|--------|------|-----|---------------|-------|
| **PostgreSQL** | 5433 | localhost:5433 | postgres | postgres |
| **pgAdmin** | 8080 | http://localhost:8080 | admin@admin.com | admin |
| **RabbitMQ Management** | 15673 | http://localhost:15673 | guest | guest |
| **Flower (Celery Monitor)** | 5555 | http://localhost:5555 | - | - |

### Container Bilgileri
| Container | İmaj | Açıklama |
|-----------|------|----------|
| viteTailMui | Custom React | Frontend uygulaması |
| flask_api | Custom Flask | Backend API |
| celery_worker | Custom Celery | Görev işleyici |
| postgres_db | postgres:15 | Ana veritabanı |
| rabbitmq | rabbitmq:3-management | Message broker |
| katana_crawler | projectdiscovery/katana | Web crawler |
| nmap_scanner | instrumentisto/nmap | Port scanner |
| whois_lookup | tooldockers/whois | Domain bilgi sorgulama |
| pgadmin | dpage/pgadmin4 | DB yönetim arayüzü |

## 🔐 Güvenlik ve Authentication

### Firebase Authentication
- Email/Password ile giriş
- Google OAuth ile giriş
- Misafir kullanıcı desteği (session tabanlı)

### Veritabanı Güvenliği
- PostgreSQL kullanıcı: `postgres`
- PostgreSQL şifre: `postgres`
- Database: `postgres`


## 📚 API Endpoints

### Ana Endpoints

#### 🔧 Araç Çalıştırma Endpoints
```
POST /api/run-command           # Genel sistem komutu çalıştırma
POST /api/run-katana           # Katana web crawler başlatma
POST /api/nmap-scan            # Nmap port scanner başlatma  
POST /api/whois-lookup         # Whois domain/IP sorgulama
```

#### 📊 Sonuç Alma Endpoints
```
GET /api/command-result/<task_id>   # Genel komut sonucu
GET /api/katana-result/<task_id>    # Katana tarama sonucu
GET /api/nmap-result/<task_id>      # Nmap tarama sonucu
GET /api/whois-result/<task_id>     # Whois sorgu sonucu
```

#### 📈 Dashboard ve Geçmiş
```
GET /api/counterData               # Ana sayfa istatistikleri
GET /api/history/<user_id>         # Kullanıcı işlem geçmişi
```

## 🗄️ Veritabanı Şeması

### Tablolar
1. **tasks** - Tüm görevlerin genel bilgileri
2. **crawl_results** - Katana tarama sonuçları
3. **nmap_results** - Nmap tarama sonuçları
4. **whois_results** - Whois sorgu sonuçları

### Örnek Task Yapısı
```json
{
  "id": "uuid-task-id",
  "task_type": "run_katana",
  "status": "SUCCESS",
  "user_id": "firebase-user-id",
  "parameters": {"url": "example.com"},
  "result": {"urls": [...], "subdomains": [...]}
}
```

## 🚀 Kullanım

### 1. Platforma Erişim
- Tarayıcınızda `http://localhost:5173` adresine gidin
- Firebase ile kayıt olun veya giriş yapın
- Misafir olarak da kullanabilirsiniz

### 2. Araç Kullanımı

#### Katana Web Crawler
```
Tool: Katana
Input: https://example.com
Output: Bulunan URL'ler, subdomain'ler
```

#### Nmap Port Scanner
```
Tool: Nmap
Input: 192.168.1.1 veya example.com
Output: Açık portlar, servisler
```

#### Whois Domain Lookup
```
Tool: Whois
Input: example.com
Output: Domain kayıt bilgileri
```

### 3. Sonuçları Görüntüleme
- Real-time sonuçlar araç sayfasında
- Geçmiş sonuçlar History sayfasında
- JSON formatında indirme seçeneği

## 🔧 Geliştirme

### Local Development
```bash
# Frontend development
cd viteTailMui
npm install
npm run dev

# Backend development
cd api
pip install -r requirements.txt
python app.py
```

### Debug Modları
- Flask DEBUG=True (development)
- React HMR aktif
- Celery verbose logging

## 📊 Monitoring ve Logs

### Celery Monitoring
- Flower UI: `http://localhost:5555`
- Worker durumu, görev kuyruğu, başarı/hata oranları

### Database Monitoring
- pgAdmin: `http://localhost:8080`
- Veritabanı performansı, query analizi

### RabbitMQ Monitoring
- Management UI: `http://localhost:15673`
- Message queue durumu, connection'lar


## 🐛 Troubleshooting

### Yaygın Sorunlar

1. **Port çakışması**: Portların kullanımda olup olmadığını kontrol edin
2. **Firebase config hatası**: `.env` dosyasının doğru yapılandırıldığından emin olun
3. **Container başlatma hatası**: `docker-compose down -v && docker-compose up -d`
4. **Database connection error**: PostgreSQL container'ının çalıştığını kontrol edin

### Log Kontrolü
```bash
# Tüm servislerin logları
docker-compose logs -f

# Belirli servis logları
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f frontend
```

## 🔮 Gelecek Planları

- [ ] Nikto vulnerability scanner entegrasyonu
- [ ] Daha fazla Nmap script desteği
- [ ] Rapor oluşturma sistemi (PDF export)
- [ ] API rate limiting
- [ ] Multi-tenant support
- [ ] Advanced filtering ve search
- [ ] Webhook notifications
- [ ] Scheduled scans
- [ ] Custom tool integration

## 👥 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje eğitim amaçlı geliştirilmiştir.

## 📞 İletişim

- **Geliştirici**: Melih Akman
- **Repository**: https://github.com/melih-akman/s4e-staj
- **Branch**: frontend  

---

⚠️ **Güvenlik Uyarısı**: Bu araçlar sadece yasal ve etik amaçlarla kullanılmalıdır. Sahip olmadığınız sistemlerde izinsiz tarama yapmayın.
