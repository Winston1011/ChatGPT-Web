<div align="center">

![ChatGPT Web](./src/assets/openai.svg)


</div>

## 演示

- 演示地址：[Web 演示](https://demo.nonezero.top)
- 后台地址：https://demo.nonezero.top/admin
- 管理账号：admin@gmail.com
- 管理密码：admin123456

如需帮助请提交 [Issues](https://github.com/Winston1011/ChatGPT-Web/issues) .
或者添加个人微信：Winston110150
![Alt text](image.png)

欢迎大家打赏！（支付宝&微信均可）
![img_1.png](img_1.png)
### 页面截图

![页面截图1](https://files.catbox.moe/tp963e.png)
![页面截图2](https://files.catbox.moe/y5avbx.png)
![页面截图3](https://files.catbox.moe/k16jsz.png)
![页面截图4](https://files.catbox.moe/8o5oja.png)

## 主要功能

- 历史对话同步
- 后台管理系统，可对用户，Token，商品，卡密等进行管理
- 精心设计的 UI，响应式设计
- 极快的首屏加载速度（~100kb）
- 支持 DALL·E 模型绘画，GPT4 等应用
- 海量的内置 prompt 列表，来自[中文](https://github.com/PlexPt/awesome-chatgpt-prompts-zh)和[英文](https://github.com/f/awesome-chatgpt-prompts)
- 一键导出聊天记录
- 支持自定义API地址（如：[openAI](https://api.openai.com) / [API2D](https://api2d.com/r/192767)）

## 运行环境

- Node 版本: `node` 需要 `^16 || ^18 || ^19` 版本（node >= 16.19.0），可以使用 nvm 管理本地多个 node 版本。
- 数据库: MYSQL + Redis
- 两个域名: 一个用作前端，一个用作后端跳转


### 服务器部署

```
## 拉取项目
git clone https://github.com/Winston1011/ChatGPT-Web.git
cd ChatGpt-Web

## 安装依赖（注意先安装好 node 及 yarn）
以及 yarn）
yarn install

```

需额外在伪静态中添加
```
location / {
  try_files $uri $uri/ /index.html;
}
```

### 后端

导入 MySQL 数据库文件： `sql/chatgpt.sql`
历史对话功能记得新增room.sql和更改message表

在 `server/config/index.js` 中修改 `后端端口` `数据库` `邮箱` 等配置

```
## 在根目录下
yarn start
```
新建一个网站，ssl验证后，反向代理 `http://127.0.0.1:3200`(可在后端配置中自行修改端口)

## 前端

**环境变量**

```
在根目录的.env.devlopment文件中更改前端指向路由地址：
后端地址
VITE_APP_REQUEST_HOST: https://xxx.xxx.xxx

APP 名称&Logo
VITE_APP_TITLE: 小橘助理
VITE_APP_LOGO: https://minioapi.nonezero.top/dz-minio-os/gpt-3.5-icon.png

## 在根目录下启动
yarn dev
```


## 更多

以上部署均为前台部署，若需要后台部署，用宝塔面板的Node添加即可

关于 `node` `yarn` `pm2` 以及 Vercle 的一些设置可以自行搜索或向[GPT](https://chat.nonezero.top) 提问

## 贡献者
感谢项目原作者 [79E](https://github.com/79E) 以及所有的 [项目贡献者](https://github.com/Winston1011/ChatGPT-Web/graphs/contributors)

## 开源协议
[![License MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://github.com/Winston1011/ChatGPT-Web/blob/master/license)
