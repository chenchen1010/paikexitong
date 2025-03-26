const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: '*', // 允许所有来源访问
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 处理静态资源的特殊处理
app.use((req, res, next) => {
  const staticHandler = express.static('public', {
    extensions: ['html', 'htm'],
    index: false,
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
      // 设置不缓存
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  });
  
  staticHandler(req, res, (err) => {
    if (err) {
      console.error('静态资源处理错误:', err);
      return next(err);
    }
    next();
  });
});

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log('请求头:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('请求体:', JSON.stringify(req.body, null, 2));
  }
  
  // 捕获响应
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`响应状态: ${res.statusCode}`);
    try {
      if (body && typeof body === 'string' && body.length < 1000) {
        console.log('响应体:', body);
      } else {
        console.log('响应体过大或非字符串，不打印');
      }
    } catch (e) {
      console.log('打印响应体时出错:', e.message);
    }
    originalSend.apply(res, arguments);
  };
  
  next();
});

// 数据文件路径
const dataPath = path.join(__dirname, 'data');
const storesFile = path.join(dataPath, 'stores.json');
const classroomsFile = path.join(dataPath, 'classrooms.json');
const teachersFile = path.join(dataPath, 'teachers.json');
const coursesFile = path.join(dataPath, 'courses.json');
const studentsFile = path.join(dataPath, 'students.json');

// 确保数据目录存在
fs.ensureDirSync(dataPath);

// 读取数据函数
const readJSONFile = (filePath) => {
  console.log(`尝试读取文件: ${filePath}`);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      console.log(`成功读取文件: ${filePath}`);
      try {
        const jsonData = JSON.parse(data);
        console.log(`成功解析JSON: ${filePath}, 数据项数量: ${Array.isArray(jsonData) ? jsonData.length : 'N/A'}`);
        return jsonData;
      } catch (parseError) {
        console.error(`JSON解析失败: ${filePath}`, parseError);
        return [];
      }
    }
    console.log(`文件不存在: ${filePath}, 返回空数组`);
    return [];
  } catch (error) {
    console.error(`读取文件 ${filePath} 出错:`, error);
    return [];
  }
};

// 写入数据函数
const writeJSONFile = (filePath, data) => {
  console.log(`尝试写入文件: ${filePath}`);
  try {
    const jsonString = JSON.stringify(data, null, 2);
    console.log(`JSON序列化成功: ${filePath}, 数据长度: ${jsonString.length}`);
    fs.writeFileSync(filePath, jsonString, 'utf8');
    console.log(`成功写入文件: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`写入文件 ${filePath} 出错:`, error);
    return false;
  }
};

// API 路由
// 获取所有门店
app.get('/api/stores', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const stores = readJSONFile(storesFile);
  res.json(stores);
});

// 获取所有教室
app.get('/api/classrooms', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const classrooms = readJSONFile(classroomsFile);
  res.json(classrooms);
});

// 获取特定门店的教室
app.get('/api/stores/:storeId/classrooms', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { storeId } = req.params;
  const classrooms = readJSONFile(classroomsFile).filter(
    classroom => classroom.storeId === storeId
  );
  res.json(classrooms);
});

// 获取所有教师
app.get('/api/teachers', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const teachers = readJSONFile(teachersFile);
  res.json(teachers);
});

// 获取所有课程
app.get('/api/courses', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const courses = readJSONFile(coursesFile);
  res.json(courses);
});

// 获取单个课程
app.get('/api/courses/:courseId', (req, res) => {
  const { courseId } = req.params;
  const courses = readJSONFile(coursesFile);
  const course = courses.find(c => c.id === courseId);
  
  if (!course) {
    return res.status(404).json({ error: '课程未找到' });
  }
  
  res.json(course);
});

// 添加课程
app.post('/api/courses', (req, res) => {
  console.log('添加单个课程 API 被调用');
  const courses = readJSONFile(coursesFile);
  const newCourse = req.body;
  console.log('请求体:', newCourse);
  
  // 生成新ID
  newCourse.id = `course${Date.now()}`;
  console.log('生成的课程ID:', newCourse.id);
  
  // 确保学生数组存在
  if (!newCourse.students) {
    newCourse.students = [];
  }
  
  console.log('即将添加新课程:', newCourse);
  courses.push(newCourse);
  
  if (writeJSONFile(coursesFile, courses)) {
    console.log('课程添加成功');
    res.status(201).json(newCourse);
  } else {
    console.error('课程添加失败');
    res.status(500).json({ error: '无法保存课程数据' });
  }
});

// 批量添加课程
app.post('/api/courses/batch', (req, res) => {
  console.log('批量添加课程 API 被调用');
  try {
    if (!req.body) {
      console.error('请求体为空');
      return res.status(400).json({ error: '请求体为空' });
    }
    
    const { batchText } = req.body;
    if (!batchText) {
      console.error('批量文本为空');
      return res.status(400).json({ error: '批量文本为空' });
    }
    
    console.log('接收到的批量文本:', batchText);
    
    const lines = batchText.split('\n').filter(line => line.trim() !== '');
    console.log(`解析出 ${lines.length} 行有效输入`);
    
    if (lines.length === 0) {
      console.error('没有有效的课程信息');
      return res.status(400).json({ error: '没有有效的课程信息' });
    }

    const courses = readJSONFile(coursesFile);
    let stores = readJSONFile(storesFile);
    let classrooms = readJSONFile(classroomsFile);
    const teachers = readJSONFile(teachersFile);

    console.log('当前数据状态:', {
      coursesCount: courses.length,
      storesCount: stores.length,
      classroomsCount: classrooms.length,
      teachersCount: teachers.length
    });

    const newCourses = [];
    const errors = [];

    lines.forEach((line, index) => {
      console.log(`处理第 ${index + 1} 行: ${line}`);
      try {
        const parts = line.trim().split(' ');

        if (parts.length < 5) {
          const error = `第 ${index + 1} 行格式错误: ${line}`;
          console.error(error);
          errors.push(error);
          return;
        }

        const [name, storeName, classroomName, teacherName, dateStr] = parts;
        console.log('解析的字段:', { name, storeName, classroomName, teacherName, dateStr });
        
        // 验证日期格式
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateStr)) {
          const error = `第 ${index + 1} 行日期格式错误，应为 YYYY-MM-DD: ${dateStr}`;
          console.error(error);
          errors.push(error);
          return;
        }

        // 查找或创建门店
        let store = stores.find(s => s.name === storeName);
        if (!store) {
          console.log(`门店 "${storeName}" 不存在，将创建新门店`);
          store = { id: `s${Date.now()}-${index}`, name: storeName };
          stores.push(store);
        } else {
          console.log(`找到已存在的门店: ${store.id}`);
        }

        // 查找或创建教室
        let classroom = classrooms.find(c => c.name === classroomName && c.storeId === store.id);
        if (!classroom) {
          console.log(`教室 "${classroomName}" 在门店 "${storeName}" 中不存在，将创建新教室`);
          classroom = { 
            id: `c${Date.now()}-${index}`, 
            name: classroomName, 
            storeId: store.id,
            capacity: 20 // 设置默认容量为20
          };
          classrooms.push(classroom);
        } else {
          console.log(`找到已存在的教室: ${classroom.id}`);
        }

        // 查找教师
        const teacher = teachers.find(t => t.name === teacherName);
        if (!teacher) {
          const error = `第 ${index + 1} 行: 教师 "${teacherName}" 不存在`;
          console.error(error);
          errors.push(error);
          return;
        } else {
          console.log(`找到已存在的教师: ${teacher.id}`);
        }

        // 创建新课程
        const newCourse = {
          id: `course${Date.now()}-${index}`,
          name,
          storeId: store.id,
          classroomId: classroom.id,
          teacherId: teacher.id,
          date: dateStr,
          students: []
        };
        console.log('创建新课程:', newCourse);

        newCourses.push(newCourse);
      } catch (lineError) {
        const error = `处理第 ${index + 1} 行时发生错误: ${lineError.message}`;
        console.error(error, lineError);
        errors.push(error);
      }
    });

    if (errors.length > 0) {
      console.error('批量添加课程失败，有错误:', errors);
      return res.status(400).json({ errors });
    }

    console.log(`成功创建 ${newCourses.length} 个新课程`);
    
    // 添加新课程
    courses.push(...newCourses);

    // 保存更新后的门店和教室数据
    console.log('保存更新后的数据');
    const storesSaved = writeJSONFile(storesFile, stores);
    const classroomsSaved = writeJSONFile(classroomsFile, classrooms);
    const coursesSaved = writeJSONFile(coursesFile, courses);
    
    console.log('保存结果:', {
      storesSaved,
      classroomsSaved,
      coursesSaved
    });

    if (coursesSaved) {
      console.log('批量添加课程成功');
      res.status(201).json(newCourses);
    } else {
      console.error('无法保存课程数据');
      res.status(500).json({ error: '无法保存课程数据' });
    }
  } catch (err) {
    console.error('批量添加课程API发生未处理的错误:', err);
    res.status(500).json({ error: '服务器内部错误', message: err.message });
  }
});

// 更新课程
app.put('/api/courses/:courseId', (req, res) => {
  const { courseId } = req.params;
  console.log(`更新课程 ${courseId}`);
  const updatedCourse = req.body;
  console.log('更新内容:', updatedCourse);
  
  const courses = readJSONFile(coursesFile);
  
  const index = courses.findIndex(c => c.id === courseId);
  
  if (index === -1) {
    console.error(`课程 ${courseId} 未找到`);
    return res.status(404).json({ error: '课程未找到' });
  }
  
  // 保持原ID
  updatedCourse.id = courseId;
  
  // 更新课程
  courses[index] = updatedCourse;
  
  if (writeJSONFile(coursesFile, courses)) {
    console.log(`课程 ${courseId} 更新成功`);
    res.json(updatedCourse);
  } else {
    console.error(`课程 ${courseId} 更新失败`);
    res.status(500).json({ error: '无法保存课程数据' });
  }
});

// 删除课程
app.delete('/api/courses/:courseId', (req, res) => {
  const { courseId } = req.params;
  const courses = readJSONFile(coursesFile);
  
  const index = courses.findIndex(c => c.id === courseId);
  
  if (index === -1) {
    return res.status(404).json({ error: '课程未找到' });
  }
  
  courses.splice(index, 1);
  
  if (writeJSONFile(coursesFile, courses)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: '无法保存课程数据' });
  }
});

// 获取课程的学生
app.get('/api/courses/:courseId/students', (req, res) => {
  const { courseId } = req.params;
  const courses = readJSONFile(coursesFile);
  const students = readJSONFile(studentsFile);
  
  const course = courses.find(c => c.id === courseId);
  
  if (!course) {
    return res.status(404).json({ error: '课程未找到' });
  }
  
  // 查找课程中的学生
  const courseStudents = students.filter(student => 
    student.courses.includes(courseId)
  );
  
  res.json(courseStudents);
});

// 批量添加学生到课程
app.post('/api/courses/:courseId/students/batch', (req, res) => {
  const { courseId } = req.params;
  const { namesText } = req.body;
  
  const courses = readJSONFile(coursesFile);
  const students = readJSONFile(studentsFile);
  
  const course = courses.find(c => c.id === courseId);
  
  if (!course) {
    return res.status(404).json({ error: '课程未找到' });
  }
  
  const names = namesText.split('\n').filter(name => name.trim() !== '');
  const newStudents = [];
  
  names.forEach(name => {
    name = name.trim();
    let student = students.find(s => s.name === name);
    
    if (!student) {
      // 创建新学生
      student = {
        id: `stu${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name,
        courses: [courseId]
      };
      students.push(student);
    } else if (!student.courses.includes(courseId)) {
      // 如果学生存在但没有加入该课程
      student.courses.push(courseId);
    }
    
    newStudents.push(student);
  });
  
  if (writeJSONFile(studentsFile, students)) {
    res.status(201).json(newStudents);
  } else {
    res.status(500).json({ error: '无法保存学生数据' });
  }
});

// 从课程中移除学生
app.delete('/api/courses/:courseId/students/:studentId', (req, res) => {
  const { courseId, studentId } = req.params;
  
  const students = readJSONFile(studentsFile);
  
  const student = students.find(s => s.id === studentId);
  
  if (!student) {
    return res.status(404).json({ error: '学生未找到' });
  }
  
  // 从学生的课程列表中移除该课程
  const courseIndex = student.courses.indexOf(courseId);
  
  if (courseIndex === -1) {
    return res.status(400).json({ error: '该学生未报名此课程' });
  }
  
  student.courses.splice(courseIndex, 1);
  
  if (writeJSONFile(studentsFile, students)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: '无法保存学生数据' });
  }
});

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message
  });
});

// 处理404
app.use((req, res) => {
  console.log(`路径未找到: ${req.method} ${req.url}`);
  res.status(404).json({ error: '请求的资源不存在' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 获取一周的开始日期（周一）
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay() || 7; // 将周日的0转换为7
  if (day !== 1) {
    d.setDate(d.getDate() - (day - 1)); // 调整到本周的周一
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

// 格式化日期
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
} 