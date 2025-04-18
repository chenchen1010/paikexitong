import json
import pandas as pd
import os
from datetime import datetime

# 读取数据文件
with open('data/courses.json', 'r', encoding='utf-8') as f:
    courses = json.load(f)

with open('data/stores.json', 'r', encoding='utf-8') as f:
    stores = json.load(f)

with open('data/classrooms.json', 'r', encoding='utf-8') as f:
    classrooms = json.load(f)

with open('data/teachers.json', 'r', encoding='utf-8') as f:
    teachers = json.load(f)

# 创建门店ID到名称的映射
store_map = {store['id']: store['name'] for store in stores}

# 创建教室ID到名称的映射
classroom_map = {classroom['id']: classroom['name'] for classroom in classrooms}

# 创建教师ID到名称的映射
teacher_map = {teacher['id']: teacher['name'] for teacher in teachers}

# 指定的日期
target_dates = [
    "2025-04-28",  # 周一
    "2025-04-29",  # 周二
    "2025-05-07",  # 周三
    "2025-05-08",  # 周四
    "2025-05-09",  # 周五
    "2025-05-10",  # 周六
    "2025-05-11"   # 周日
]

# 获取星期几
def get_weekday(date_str):
    weekday_names = {
        0: "周一",
        1: "周二",
        2: "周三",
        3: "周四",
        4: "周五",
        5: "周六",
        6: "周日"
    }
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    return weekday_names[date_obj.weekday()]

# 筛选指定日期的课程
filtered_courses = []
for course in courses:
    if 'date' in course and course['date'] in target_dates:
        # 如果不是占位课程（isPlaceholder不存在或为False）
        if not course.get('isPlaceholder', False):
            filtered_courses.append(course)

# 准备数据
rows = []
for course in filtered_courses:
    store_name = store_map.get(course.get('storeId', ''), '未知门店')
    classroom_name = classroom_map.get(course.get('classroomId', ''), '未知教室')
    teacher_name = teacher_map.get(course.get('teacherId', ''), '未知老师')
    date = course.get('date', '')
    weekday = get_weekday(date)
    
    row = {
        '课程名称': course.get('name', ''),
        '价格&课时': '总价500 共10节 45分钟/节 2节/次 1周/次 共5次',
        '上课时间': f"{weekday} 19:00-20:30",
        '门店': store_name,
        '教室': classroom_name,
        '教室容量': '15-20人',
        '开课时间': date,
        '星期': weekday,
        '老师': teacher_name,
        '门店ID': course.get('storeId', '')
    }
    rows.append(row)

# 创建DataFrame
df = pd.DataFrame(rows)

# 按日期排序
df['开课时间_datetime'] = pd.to_datetime(df['开课时间'])
df = df.sort_values(['门店', '开课时间_datetime'])
df = df.drop('开课时间_datetime', axis=1)

# 调整列顺序与图片一致
df = df[['课程名称', '价格&课时', '上课时间', '门店', '教室', '教室容量', '开课时间', '老师']]

# 保存到Excel - 所有数据保存到一个工作表
output_path = 'output/课程安排_所有门店.xlsx'
with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
    # 保存所有数据到"全部门店"工作表
    df.to_excel(writer, sheet_name='全部门店', index=False)
    
    # 获取所有门店的数据，确保所有门店都有工作表
    store_groups = df.groupby('门店')
    existing_stores = set(store_groups.groups.keys())
    
    # 按门店分组并保存到不同的工作表
    for store_name, group_data in store_groups:
        # 确保工作表名称不超过31个字符(Excel限制)
        sheet_name = store_name
        if len(sheet_name) > 31:
            sheet_name = sheet_name[:28] + '...'
        
        # 删除多余列后保存
        group_data.to_excel(writer, sheet_name=sheet_name, index=False)
    
    # 为没有课程的门店创建空工作表
    columns = df.columns.tolist()
    for store in stores:
        store_name = store['name']
        if store_name not in existing_stores:
            # 创建空DataFrame，保持相同的列结构
            empty_df = pd.DataFrame(columns=columns)
            
            # 确保工作表名称不超过31个字符
            sheet_name = store_name
            if len(sheet_name) > 31:
                sheet_name = sheet_name[:28] + '...'
                
            empty_df.to_excel(writer, sheet_name=sheet_name, index=False)

# 统计每个门店的课程数量
store_course_counts = df['门店'].value_counts().to_dict()
print(f"已将{len(filtered_courses)}个课程的安排导出到 {output_path}")
print("各门店课程数量:")
for store in stores:
    store_name = store['name']
    count = store_course_counts.get(store_name, 0)
    print(f"- {store_name}: {count}课程") 