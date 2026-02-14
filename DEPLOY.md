# SimplePDF 部署指南

## 自动部署配置

本项目已配置自动部署，推送代码到GitHub后会自动触发部署。

---

## 前端部署（Vercel）

### 1. 连接GitHub仓库
1. 访问 [Vercel](https://vercel.com)
2. 点击 "Add New Project"
3. 导入 `simple-pdf` GitHub仓库
4. 配置：
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. 添加环境变量：`VITE_API_URL` = 你的后端API地址
6. 点击 Deploy

### 2. 自动部署
- 每次推送到 `master` 分支，Vercel自动重新部署
- 预览链接会显示在GitHub PR中

---

## 后端部署（Railway）

### 1. 连接GitHub仓库
1. 访问 [Railway](https://railway.app)
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择 `simple-pdf` 仓库
4. Railway自动读取 `railway.toml` 配置
5. 环境变量：
   - `PORT` = 8000（已配置）

### 2. 自动部署
- 每次推送到 `master` 分支，Railway自动重新部署
- 健康检查 endpoint: `/api/health`

### 3. 获取API地址
部署完成后，Railway会提供一个域名：
```
https://simplepdf-api.up.railway.app
```

将这个地址添加到Vercel的环境变量 `VITE_API_URL` 中。

---

## 手动部署（备用方案）

### 前端手动部署
```bash
cd frontend
npm run build
# 将 dist/ 目录上传到任何静态托管服务
```

### 后端手动部署
```bash
cd backend
docker build -t simplepdf-backend .
docker run -p 8000:8000 simplepdf-backend
```

---

## 域名配置（可选）

### Vercel自定义域名
1. 在Vercel项目设置中添加自定义域名
2. 按提示配置DNS记录

### Railway自定义域名
1. 在Railway项目设置中添加自定义域名
2. 配置 CNAME 记录指向 Railway 提供的域名

---

## 监控和日志

### Vercel
- Analytics: 查看访问量、性能指标
- Logs: 查看部署日志和运行时日志

### Railway
- Logs: 查看容器日志
- Metrics: 查看CPU、内存使用情况
- 告警: 可配置宕机通知

---

## 部署状态检查

部署完成后，检查以下端点：

```bash
# 前端
curl https://your-vercel-domain.vercel.app

# 后端健康检查
curl https://your-railway-domain.railway.app/api/health

# 后端API测试
curl -X POST -F "file=@test.pdf" \
  https://your-railway-domain.railway.app/api/convert/pdf-to-word
```

---

## 故障排查

### 前端无法连接后端
1. 检查 `VITE_API_URL` 环境变量是否正确
2. 确认后端CORS配置允许前端域名
3. 检查浏览器控制台网络请求

### 后端转换失败
1. 查看Railway日志：`railway logs`
2. 检查文件大小是否超过限制（50MB）
3. 确认PDF文件未损坏

### 部署失败
1. 检查GitHub Actions日志
2. 确认Dockerfile能本地构建成功
3. 检查环境变量是否正确设置

---

## 快速检查清单

- [ ] GitHub仓库已连接Vercel
- [ ] GitHub仓库已连接Railway
- [ ] 后端部署成功， health check 返回200
- [ ] Vercel环境变量 `VITE_API_URL` 已设置
- [ ] 前端部署成功，页面能正常打开
- [ ] 上传PDF测试转换功能正常
