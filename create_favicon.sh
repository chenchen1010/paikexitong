#!/bin/bash

# 创建一个彩色正方形图像作为favicon
convert -size 64x64 xc:#1ABB9C -gravity center -pointsize 30 -font Arial -fill white -annotate 0 "排" public/logo.png

# 将PNG转换为ico格式（多尺寸）
magick public/logo.png -define icon:auto-resize=16,32,48,64 public/favicon.ico

echo "图标创建完成" 