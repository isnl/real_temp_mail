临时邮箱客户端 点击看广告获取邮箱配额

定义 code 值

例如：code=N87b0GvU

携带固定 秘钥 调用 express-mp 新增一条看广告记录数据

```json
{
  "code"："N87b0GvU",
  "userId": 1,
  "source": "temp-email"
}

```

调用 worker api

判断小程序access_token是否有效，无效则调用 worker api 先获取 access_token:
https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/miniapp/openapi/getaccesstoken.html

再生成带参数的小程序二维码:
https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html


微信扫码打开，引导用户看广告，获取进入场景值、参数code

如果用户正确看完广告，则更新接口

```json
{
  "code": "N87b0GvU",
  "userId": 1,
  "source": "temp-email",
  "openId": "o-BAB08c7sACBScWcJwPp-QqDxzk",
  "status": true
}
```

点击 我看完了 

根据 code 查询看广告状态 status

status为true，下发配额奖励，status为false，提示用户未看广告，刷新二维码