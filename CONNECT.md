# SimplePDF 前后端关联配置

## 关联步骤

### 1. 获取后端地址（Railway）

在 Railway Dashboard 中：
1. 点击你的后端服务
2. 找到 **Domains** 部分
3. 复制域名，例如：
   ```
   https://simplepdf-api.up.railway.app
   ```

### 2. 配置前端环境变量（Vercel）

在 Vercel Dashboard 中：
1. 进入你的前端项目
2. 点击 **Settings** → **Environment Variables**
3. 添加变量：
   - **Name**: `VITE_API_URL`
   - **Value**: `https://simplepdf-api.up.railway.app` (你的后端地址)
4. 点击 **Save**
5. 重新部署前端（Redeploy）

### 3. 验证关联

部署完成后测试：

```bash
# 1. 打开前端网站
https://your-frontend.vercel.app

# 2. 打开浏览器开发者工具 (F12)
# 3. 查看 Network 标签
# 4. 上传一个PDF文件
# 5. 应该能看到请求发送到后端地址
```

---

## 配置检查清单

- [ ] Railway 后端部署成功（状态: ✅ Healthy）
- [ ] 获取到 Railway 域名（如 xxx.up.railway.app）
- [ ] Vercel 添加了 `VITE_API_URL` 环境变量
- [ ] Vercel 重新部署完成
- [ ] 前端能正常上传并转换PDF

---

## 常见问题

### 问题1: 前端报错 "Failed to fetch"
- 检查 `VITE_API_URL` 是否正确
- 检查后端是否允许跨域（CORS已配置）
- 检查后端服务是否正常运行

### 问题2: CORS 错误
后端已配置允许所有域名：
```python
allow_origins=["*"]
```
如果还有问题，告诉我具体的错误信息。

### 问题3: 环境变量不生效
Vercel 需要重新部署才能读取新环境变量：
1. 在 Vercel 点击 "Redeploy"
2. 等待部署完成

---

## 架构图

```
用户浏览器
    ↓ 访问
Vercel 前端 (simple-pdf.vercel.app)
    ↓ API请求: https://railway-backend.up.railway.app/api/xxx
Railway 后端
    ↓ 处理PDF
返回文件给用户下载
```

---

**告诉我你的 Railway 域名，我帮你检查配置！**
