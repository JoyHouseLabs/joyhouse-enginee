// 加载本地图标
async function loadLocalIcons() {
  try {
    const response = await fetch('/icons/mdi-icons.svg');
    const svgText = await response.text();
    const div = document.createElement('div');
    div.innerHTML = svgText;
    document.body.appendChild(div);
    console.log('本地图标加载成功');
  } catch (error) {
    console.error('加载本地图标失败:', error);
  }
}

// 使用图标的函数
function useIcon(iconId, size = 24, color = 'currentColor') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', color);
  use.setAttribute('href', `#${iconId}`);
  
  svg.appendChild(use);
  return svg;
}

// 导出函数
window.loadLocalIcons = loadLocalIcons;
window.useIcon = useIcon; 