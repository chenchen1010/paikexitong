import json
import re

# 读取课程数据
with open('data/courses.json', 'r', encoding='utf-8') as f:
    courses = json.load(f)

# 提取所有课程名称
course_names = set([course.get('name', '') for course in courses if 'name' in course])

# 用于存储基础课程名称和原始名称的对应关系
course_mapping = {}

# 手动定义一些课程的映射关系
manual_mapping = {
    # Deepseek相关课程
    'Deepseek创作与应用': 'Deepseek课程',
    'Deepseek创作与应用（500）': 'Deepseek课程',
    'Deepseek应用与变现': 'Deepseek课程',
    'Deepseek应用与变现1班': 'Deepseek课程',
    'Deepseek应用与变现（延期）': 'Deepseek课程',
    'deepseek基础应用': 'Deepseek课程',
    'deepseek基础应用（700）': 'Deepseek课程',
    'deepseek应用与变现': 'Deepseek课程',
    'deepseek应用与变现（900）': 'Deepseek课程',
    'deepseek应用与变现（900）（推迟）': 'Deepseek课程',
    
    # 书法和国画
    '书法国画': '书法和国画',
    '书法国画（推迟）': '书法和国画',
    '国画': '书法和国画',
    
    # 茶艺
    '茶艺': '茶艺',
    '茶艺（推迟）': '茶艺',
    '调饮茶': '茶艺',
    
    # 化妆
    '化妆课': '化妆',
}

# 处理每个课程名称，提取基础部分
for name in course_names:
    # 如果在手动映射中有定义，直接使用
    if name in manual_mapping:
        base_name = manual_mapping[name]
    else:
        # 去除括号内容、班级编号、状态标记等
        base_name = re.sub(r'（.*?）|\(.*?\)|（推迟.*|（待.*|（要.*|（第.*|\d+班|新班.*|第一次.*|推迟.*', '', name).strip()
    
    if not base_name:
        base_name = name
    
    # 记录原始名称到基础名称的映射
    if base_name not in course_mapping:
        course_mapping[base_name] = []
    course_mapping[base_name].append(name)

# 打印排序后的基础课程名称及其对应的原始名称
for base_course in sorted(course_mapping.keys()):
    original_courses = course_mapping[base_course]
    print(f"{base_course}:")
    if len(original_courses) > 1:
        for orig in sorted(original_courses):
            if orig != base_course:
                print(f"  - {orig}")

print(f"\n总共有 {len(course_mapping)} 种不同的课程类型。") 