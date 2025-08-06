const fs = require('fs');
const path = require('path');

/**
 * 使用Canvas API将SVG转换为PNG的Node.js脚本
 * 需要安装依赖: npm install canvas
 */

async function convertSvgToPng() {
  try {
    // 动态导入canvas模块
    const { createCanvas, loadImage } = await import('canvas');
    
    const svgPath = path.join(__dirname, '../public/favicon-template.svg');
    const pngPath = path.join(__dirname, '../public/favicon.png');
    
    // 读取SVG文件
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    // 创建canvas
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d');
    
    // 将SVG转换为Data URL
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    
    // 加载并绘制图像
    const img = await loadImage(svgDataUrl);
    ctx.drawImage(img, 0, 0, 32, 32);
    
    // 保存为PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(pngPath, buffer);
    
    console.log('✅ favicon.png 转换成功！');
    console.log('文件位置:', pngPath);
    
    // 生成不同尺寸
    const sizes = [16, 32, 48];
    for (const size of sizes) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      const img = await loadImage(svgDataUrl);
      ctx.drawImage(img, 0, 0, size, size);
      
      const buffer = canvas.toBuffer('image/png');
      const sizePath = path.join(__dirname, `../public/favicon-${size}x${size}.png`);
      fs.writeFileSync(sizePath, buffer);
      console.log(`✅ favicon-${size}x${size}.png 生成成功！`);
    }
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ 未找到canvas模块。请安装依赖:');
      console.log('cd frontend && npm install canvas');
    } else {
      console.error('❌ 转换失败:', error.message);
    }
  }
}

// 检查SVG文件是否存在
const svgPath = path.join(__dirname, '../public/favicon-template.svg');
if (!fs.existsSync(svgPath)) {
  console.error('❌ 未找到SVG模板文件:', svgPath);
  process.exit(1);
}

convertSvgToPng();
