# Favicon 转换工具

这个目录包含了将SVG favicon转换为PNG格式的工具和脚本。

## 文件说明

- `favicon-template.svg` - 带有10px圆角的SVG favicon模板
- `favicon-rounded.svg` - 64x64尺寸的圆角SVG favicon
- `convert-favicon.sh` - 使用ImageMagick的转换脚本
- `convert-favicon.js` - 使用Node.js Canvas的转换脚本

## 使用方法

### 方法1：使用ImageMagick (推荐)

1. 安装ImageMagick:
   ```bash
   # macOS
   brew install imagemagick
   
   # Ubuntu/Debian
   sudo apt-get install imagemagick
   
   # Windows (使用Chocolatey)
   choco install imagemagick
   ```

2. 运行转换脚本:
   ```bash
   cd frontend/scripts
   ./convert-favicon.sh
   ```

### 方法2：使用Node.js Canvas

1. 安装依赖:
   ```bash
   cd frontend
   npm install canvas
   ```

2. 运行转换脚本:
   ```bash
   cd frontend/scripts
   node convert-favicon.js
   ```

### 方法3：在线转换

1. 打开 `frontend/public/favicon-template.svg` 文件
2. 复制SVG代码
3. 访问在线转换工具（如 [convertio.co](https://convertio.co/svg-png/) 或 [cloudconvert.com](https://cloudconvert.com/svg-to-png)）
4. 粘贴SVG代码或上传文件
5. 设置输出尺寸为32x32像素
6. 下载生成的PNG文件并重命名为 `favicon.png`
7. 将文件放置到 `frontend/public/` 目录

## 输出文件

转换完成后，将在 `frontend/public/` 目录生成以下文件：

- `favicon.png` - 32x32像素的主favicon
- `favicon-16x16.png` - 16x16像素版本
- `favicon-32x32.png` - 32x32像素版本  
- `favicon-48x48.png` - 48x48像素版本

## 圆角说明

SVG模板使用了以下圆角设置：
- 32x32尺寸：5px圆角（相当于64x64尺寸的10px圆角）
- 64x64尺寸：10px圆角

这确保了在不同尺寸下都能保持一致的圆角比例。

## 故障排除

### ImageMagick相关问题

如果遇到权限问题，可能需要修改ImageMagick的安全策略：

```bash
# 编辑策略文件
sudo nano /etc/ImageMagick-6/policy.xml

# 找到以下行并注释掉或删除：
<!-- <policy domain="coder" rights="none" pattern="SVG" /> -->
```

### Canvas相关问题

如果在安装canvas模块时遇到问题，可能需要安装系统依赖：

```bash
# Ubuntu/Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# macOS
# 通常Xcode命令行工具已足够
xcode-select --install
```
