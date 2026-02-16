# SimplePDF 项目任务规划与安全问题分析

## 🔴 紧急安全任务（必须立即处理）

### S1. API 访问控制
**风险等级**: 🔴 高危

**问题**:
- 当前 API 允许任意来源访问 (`allow_origins=["*"]`)
- 没有速率限制，易受 DDoS 攻击
- 没有 API 认证机制

**解决方案**:
```python
# 1. 限制 CORS 来源
allow_origins=["https://simplepdf.com", "https://www.simplepdf.com"]

# 2. 添加速率限制
from slowapi import Limiter
limiter = Limiter(key_func=lambda: request.client.host)

# 3. 文件大小限制已在，但需加强验证
```

**检查项**:
- [ ] 修改 CORS 配置，只允许生产域名
- [ ] 添加速率限制 (100 请求/分钟/IP)
- [ ] 添加请求头验证

---

### S2. 文件上传安全
**风险等级**: 🔴 高危

**问题**:
- 文件类型验证仅靠扩展名检查
- 没有文件内容扫描
- 临时文件清理机制存在但可绕过

**解决方案**:
```python
# 1. 深度文件类型检查 (magic bytes)
import magic
mime = magic.from_buffer(content, mime=True)

# 2. 文件内容扫描 (防止恶意 PDF)
# 检查 PDF 结构是否合法

# 3. 文件名清理
import re
safe_filename = re.sub(r'[^\w\-.]', '_', filename)
```

**检查项**:
- [ ] 使用 python-magic 验证文件真实类型
- [ ] 添加 PDF 结构验证
- [ ] 文件名转义处理
- [ ] 限制上传文件数量（防止 zip bomb）

---

### S3. 加密/解密 API 安全
**风险等级**: 🟡 中危

**问题**:
- 解密 API 没有防止暴力破解
- 密码在内存中可能存在时间较长
- 没有记录失败的解密尝试

**解决方案**:
- [ ] 解密 API 添加速率限制（5 次/分钟）
- [ ] 使用 secure memory 处理密码
- [ ] 记录失败尝试日志

---

## 🟡 生产环境任务（本周完成）

### P1. Railway 后端部署监控
**状态**: 代码已推送，需验证

**验证清单**:
```bash
# 1. 健康检查
curl $RAILWAY_URL/api/health

# 2. 新功能测试
curl -X POST $RAILWAY_URL/api/convert/pdf-to-ppt -F "file=@test.pdf"
curl -X POST $RAILWAY_URL/api/protect/encrypt -F "file=@test.pdf" -F "password=123"
curl -X POST $RAILWAY_URL/api/watermark/add -F "file=@test.pdf" -F "type=text" -F "text=TEST"

# 3. 依赖检查
curl $RAILWAY_URL/api/health  # 应该返回 version 1.0.1
```

**检查项**:
- [ ] python-pptx 安装成功
- [ ] pikepdf 安装成功
- [ ] pdfplumber 安装成功
- [ ] 所有新端点可访问

---

### P2. 日志和监控
**必要性**: 🔴 高

**需要监控的指标**:
- API 响应时间
- 错误率
- 文件处理成功率
- 存储使用情况

**实施方案**:
```python
# 1. 结构化日志
import logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# 2. 添加 Sentry 错误追踪
import sentry_sdk
sentry_sdk.init(
    dsn="your-sentry-dsn",
    traces_sample_rate=1.0,
)
```

**检查项**:
- [ ] 配置结构化日志
- [ ] 集成 Sentry 或类似服务
- [ ] 设置 Railway 日志告警

---

### P3. 前端生产部署
**方案对比**:

| 方案 | 优点 | 缺点 | 推荐 |
|------|------|------|------|
| Vercel | 自动部署、CDN、简单 | 国内访问慢 | ⭐ |
| Cloudflare Pages | 免费、全球 CDN | 配置稍复杂 | ⭐⭐ |
| 自有服务器 | 完全控制 | 需维护 | 备用 |

**检查项**:
- [ ] 选择部署平台
- [ ] 配置生产 API URL
- [ ] 配置域名和 SSL
- [ ] 配置 CDN

---

## 🟢 功能优化任务（本月完成）

### F1. PDF 转 Word 质量提升
**问题**: 复杂表格和样式丢失

**方案**:
1. **短期**: 调整 pdf2docx 参数
2. **中期**: 尝试 pdf2docx 替代品 (如 comtypes + Word COM)
3. **长期**: 云端转换 API (如 ILovePDF API)

**检查项**:
- [ ] 测试不同复杂度 PDF
- [ ] 对比转换质量
- [ ] 选择最佳方案

---

### F2. 大文件支持
**当前限制**: 50MB

**技术方案**:
```python
# 1. 流式处理
# 2. 分片上传
# 3. 后台异步处理 + WebSocket 通知
```

---

## 📊 产品任务（发布前完成）

### M1. Google Analytics
**追踪事件**:
- 工具选择 (Tool Selected)
- 文件上传 (File Uploaded)
- 转换成功 (Conversion Success)
- 转换失败 (Conversion Failed)
- 文件下载 (File Downloaded)

**检查项**:
- [ ] 创建 GA4 Property
- [ ] 添加跟踪代码
- [ ] 配置事件追踪
- [ ] 设置转化目标

---

### M2. SEO 优化
**技术 SEO**:
- [ ] 完善 meta 标签
- [ ] 添加结构化数据 (Schema.org)
- [ ] 生成 sitemap.xml
- [ ] 配置 robots.txt

**内容 SEO**:
- [ ] 优化首页关键词
- [ ] 为每个工具页写描述
- [ ] 添加 FAQ 页面

---

### M3. Product Hunt 发布
**时间线**:
- T-7天: 准备素材
- T-3天: 邀请朋友预热
- T-1天: 发布准备
- T-Day: 上午 8:00 PST 发布

**素材清单**:
- [ ] 产品截图 (首页 + 各工具)
- [ ] 演示 GIF (转换过程)
- [ ] 产品描述 (英文，< 260 字符)
- [ ] 首条评论 (说明产品亮点)
- [ ] 制造者回复模板

---

## 📅 任务优先级排序

### 本周必须完成（安全 + 部署）
1. 🔴 **S1** - API 访问控制（CORS + 速率限制）
2. 🔴 **S2** - 文件上传安全验证
3. 🔴 **P1** - Railway 部署验证
4. 🟡 **P2** - 日志和监控

### 下周完成（生产环境）
5. 🟡 **P3** - 前端生产部署
6. 🟡 **M1** - Google Analytics

### 本月完成（优化）
7. 🟢 **F1** - PDF 转 Word 质量
8. 🟢 **M2** - SEO 优化
9. 🟢 **M3** - Product Hunt 发布

---

## 🔒 安全自查清单

### 部署前必须检查
- [ ] CORS 只允许生产域名
- [ ] 速率限制已启用
- [ ] 文件类型深度验证
- [ ] 敏感操作（解密）有限流
- [ ] 日志不记录敏感信息（密码）
- [ ] 临时文件自动清理
- [ ] 错误信息不暴露内部细节

### 部署后监控
- [ ] 异常访问模式
- [ ] 错误率突增
- [ ] 存储空间使用
- [ ] API 响应时间
