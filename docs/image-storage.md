# 系统图片存储

桶：oh-yes-images，R2 Standard，保持私有。个人图床 images 不变；免费额度按账号共用。

## 配置

本地 .env.local、Vercel 对应环境分别配置：

- R2_BUCKET_NAME：oh-yes-images
- R2_ENDPOINT：Cloudflare 提供的完整 S3 endpoint（HTTPS）
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY

凭据仅授予 oh-yes-images 对象读写，不使用 NEXT_PUBLIC_ 前缀；Vercel 修改环境变量后需重新部署。无需公开域名；浏览器直传必须配置下方 CORS。上线前用团队实际网络验证上传和预览速度。

## 行为

整体反馈和调整项支持选择/粘贴 JPEG、PNG、WebP，每张不超过 20 MB，每组界面最多 20 张。浏览器先解码并检查像素数，按下方规则适度缩图，然后立即申请十分钟有效的上传地址，直接 PUT 到 R2 的 `images/<UUID>/original`。整个页面最多两个任务并发。保存时等待已有任务完成，仅关联上传成功的稳定 `/api/images/<UUID>` 地址；切换反馈步骤不会中断任务，失败图片可以单独重试。

每张新图片只保存 `images/<UUID>/original` 一个对象。列表、预览和 PDF 使用同一文件，不生成或上传缩略图；历史图片的 `?thumbnail=1` 请求也会兼容地返回原图。读图沿用现有系统登录认证，认证后 302 到五分钟有效的 R2 GET 地址，避免图片响应经过 Vercel；持有短期链接者可在有效期内读取图片。写图沿用项目写权限。全体已登录员工可读，未引入单项目图片 ACL；现有认证方案本身的安全性仍需按上线清单检查。

## 清理与费用

图片从反馈移除时不立即删除对象，避免误删历史引用。异常断网或反馈保存失败也可能遗留对象。

人工只读检查：node --import tsx scripts/cleanup-unused-images.ts

确认使用了正确的数据库与 R2 环境后，添加 --execute 清理七天前且未关联的图片；脚本也兼容清理旧流程遗留的 pending 临时对象和缩略图。运行期间避免恢复或编辑七天前的未保存草稿。此脚本未自动调度。未来其他功能接入图片时，必须增加其引用查询，之后才继续使用清理脚本。

预算提醒是 Cloudflare 账号金额提醒，不是存储硬上限。本轮未实现 8/9 GB 容量提醒或自动停传，读写次数也可能产生费用。


## 浏览器直传跨域配置

Cloudflare → R2 → oh-yes-images → Settings → CORS Policy，添加下面配置。该配置允许指定页面使用签名地址，不会把桶变成公开桶。若已有规则，保留原规则并合并此项。

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "http://127.0.0.1:3000", "https://app.oh-yes-business.com", "https://oh-yes-business.vercel.app"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

其他本地端口或 Vercel 预览域名需单独加入明确的 Origin。现有对象读写令牌无桶配置权限，不扩大密钥权限；由控制台配置。20 MB 为应用默认上限，原始像素最多一亿，非 R2 限制。

存储层直传验证：node --import tsx scripts/verify-r2-direct-upload.ts（生成超过 4.5 MB 图片，单对象上传并逐字节读回后删除生成的测试对象；不操作业务数据库）。

### 上传前缩图

新选图片统一在浏览器内将最长边限制为 3200px（小图不放大）；PNG 沿用 PNG 编码，照片 JPEG/WebP 使用质量 0.9 的 WebP。只采用比原文件小的结果。浏览器无法解码或图片超过一亿像素时拒绝上传；重试复用本次处理结果。已有存储对象不修改；PDF 使用实际存储图片。
