const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

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
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return [];
  } catch (error) {
    console.error(`读取文件 ${filePath} 出错:`, error);
    return [];
  }
};

// 写入数据函数
const writeJSONFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`写入文件 ${filePath} 出错:`, error);
    return false;
  }
};

// API 路由
// 获取所有门店
app.get('/api/stores', (req, res) => {
  const stores = readJSONFile(storesFile);
  res.json(stores);
});

// 获取所有教室
app.get('/api/classrooms', (req, res) => {
  const classrooms = readJSONFile(classroomsFile);
  res.json(classrooms);
});

// 获取特定门店的教室
app.get('/api/stores/:storeId/classrooms', (req, res) => {
  const { storeId } = req.params;
  const classrooms = readJSONFile(classroomsFile).filter(
    classroom => classroom.storeId === storeId
  );
  res.json(classrooms);
});

// 获取所有教师
app.get('/api/teachers', (req, res) => {
  const teachers = readJSONFile(teachersFile);
  res.json(teachers);
});

// 获取所有课程
app.get('/api/courses', (req, res) => {
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
  const courses = readJSONFile(coursesFile);
  const newCourse = req.body;
  
  // 生成新ID
  newCourse.id = `course${Date.now()}`;
  
  // 确保学生数组存在
  if (!newCourse.students) {
    newCourse.students = [];
  }
  
  courses.push(newCourse);
  
  if (writeJSONFile(coursesFile, courses)) {
    res.status(201).json(newCourse);
  } else {
    res.status(500).json({ error: '无法保存课程数据' });
  }
});

// 批量添加课程
app.post('/api/courses/batch', (req, res) => {
  const { batchText } = req.body;
  const lines = batchText.split('\n').filter(line => line.trim() !== '');

  const courses = readJSONFile(coursesFile);
  let stores = readJSONFile(storesFile);
  let classrooms = readJSONFile(classroomsFile);
  const teachers = readJSONFile(teachersFile);

  const newCourses = [];
  const errors = [];

  lines.forEach((line, index) => {
    const parts = line.trim().split(' ');

    if (parts.length < 5) {
      errors.push(`第 ${index + 1} 行格式错误: ${line}`);
      return;
    }

    const [name, storeName, classroomName, teacherName, dayOfWeekStr] = parts;
    const dayOfWeek = parseInt(dayOfWeekStr);

    if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
      errors.push(`第 ${index + 1} 行星期格式错误: ${dayOfWeekStr}`);
      return;
    }

    // 查找或创建门店
    let store = stores.find(s => s.name === storeName);
    if (!store) {
      store = { id: `s${Date.now()}-${index}`, name: storeName };
      stores.push(store);
    }

    // 查找或创建教室
    let classroom = classrooms.find(c => c.name === classroomName && c.storeId === store.id);
    if (!classroom) {
      classroom = { id: `c${Date.now()}-${index}`, name: classroomName, storeId: store.id };
      classrooms.push(classroom);
    }

    // 查找教师
    const teacher = teachers.find(t => t.name === teacherName);
    if (!teacher) {
      errors.push(`第 ${index + 1} 行: 教师 "${teacherName}" 不存在`);
      return;
    }

    // 创建新课程
    const newCourse = {
      id: `course${Date.now()}-${index}`,
      name,
      storeId: store.id,
      classroomId: classroom.id,
      teacherId: teacher.id,
      dayOfWeek,
      students: []
    };

    newCourses.push(newCourse);
  });

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  // 添加新课程
  courses.push(...newCourses);

  // 保存更新后的门店和教室数据
  writeJSONFile(storesFile, stores);
  writeJSONFile(classroomsFile, classrooms);

  if (writeJSONFile(coursesFile, courses)) {
    res.status(201).json(newCourses);
  } else {
    res.status(500).json({ error: '无法保存课程数据' });
  }
});

// 更新课程
app.put('/api/courses/:courseId', (req, res) => {
  const { courseId } = req.params;
  const updatedCourse = req.body;
  const courses = readJSONFile(coursesFile);
  
  const index = courses.findIndex(c => c.id === courseId);
  
  if (index === -1) {
    return res.status(404).json({ error: '课程未找到' });
  }
  
  // 保持原ID
  updatedCourse.id = courseId;
  
  // 更新课程
  courses[index] = updatedCourse;
  
  if (writeJSONFile(coursesFile, courses)) {
    res.json(updatedCourse);
  } else {
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
}); 