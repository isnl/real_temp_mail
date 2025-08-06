#!/bin/bash

# 转换SVG favicon为PNG格式的脚本
# 需要安装 ImageMagick: brew install imagemagick (macOS) 或 apt-get install imagemagick (Ubuntu)

echo "正在转换favicon..."

# 检查是否安装了ImageMagick
if ! command -v convert &> /dev/null; then
    echo "错误: 未找到ImageMagick。请先安装ImageMagick:"
    echo "macOS: brew install imagemagick"
    echo "Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi

# 转换SVG为PNG
convert -background transparent -size 32x32 ../public/favicon-template.svg ../public/favicon.png

if [ $? -eq 0 ]; then
    echo "✅ favicon.png 转换成功！"
    echo "文件位置: frontend/public/favicon.png"
else
    echo "❌ 转换失败"
    exit 1
fi

# 可选：生成不同尺寸的favicon
echo "正在生成不同尺寸的favicon..."

# 16x16
convert -background transparent -size 16x16 ../public/favicon-template.svg ../public/favicon-16x16.png

# 32x32 (已生成)
# convert -background transparent -size 32x32 ../public/favicon-template.svg ../public/favicon-32x32.png

# 48x48
convert -background transparent -size 48x48 ../public/favicon-template.svg ../public/favicon-48x48.png

echo "✅ 所有尺寸的favicon生成完成！"
