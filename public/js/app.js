// 全局变量
let stores = [];
let classrooms = [];
let teachers = [];
let courses = [];
let students = [];
let currentCourse = null;
let currentWeekStart = getWeekStart(new Date());

// DOM 元素
const scheduleGrid = document.getElementById('schedule-grid');
const currentWeekEl = document.getElementById('current-week');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const addCourseBtn = document.getElementById('add-course-btn');
const batchAddCoursesBtn = document.getElementById('batch-add-courses-btn');

// 课程模态框元素
const courseModal = document.getElementById('course-modal');
const courseForm = document.getElementById('course-form');
const courseNameInput = document.getElementById('course-name');
const storeSelect = document.getElementById('store-select');
const classroomSelect = document.getElementById('classroom-select');
const teacherSelect = document.getElementById('teacher-select');
const daySelect = document.getElementById('day-select');
const saveCourseBtn = document.getElementById('save-course-btn');
const deleteCourseBtn = document.getElementById('delete-course-btn');
const modalTitle = document.getElementById('modal-title');
const studentsList = document.getElementById('students-list');
const studentsBatchText = document.getElementById('students-batch');
const addStudentsBtn = document.getElementById('add-students-btn');

// 批量添加课程模态框元素
const batchCoursesModal = document.getElementById('batch-courses-modal');
const coursesBatchText = document.getElementById('courses-batch');
const submitBatchCoursesBtn = document.getElementById('submit-batch-courses');

// 模态框关闭按钮
const closeButtons = document.querySelectorAll('.close');

// 初始化应用
document.addEventListener('DOMContentLoaded', init);

// 周导航事件监听
prevWeekBtn.addEventListener('click', () => {
  const prevWeek = new Date(currentWeekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  currentWeekStart = getWeekStart(prevWeek);
  updateSchedule();
});

nextWeekBtn.addEventListener('click', () => {
  const nextWeek = new Date(currentWeekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  currentWeekStart = getWeekStart(nextWeek);
  updateSchedule();
});

// 添加课程按钮
addCourseBtn.addEventListener('click', () => {
  openCourseModal();
});

// 批量添加课程按钮
batchAddCoursesBtn.addEventListener('click', () => {
  batchCoursesModal.style.display = 'block';
});

// 提交批量添加课程
submitBatchCoursesBtn.addEventListener('click', async () => {
  const batchText = coursesBatchText.value.trim();
  
  if (!batchText) {
    alert('请输入课程信息');
    return;
  }
  
  try {
    const response = await fetch('/api/courses/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchText })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('批量添加课程成功');
      batchCoursesModal.style.display = 'none';
      coursesBatchText.value = '';
      fetchData();
    } else {
      alert(`批量添加失败: ${result.errors ? result.errors.join('\n') : result.error}`);
    }
  } catch (error) {
    console.error('批量添加课程错误:', error);
    alert('批量添加课程失败，请查看控制台获取详情');
  }
});

// 课程表单提交
courseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const course = {
    name: courseNameInput.value,
    storeId: storeSelect.value,
    classroomId: classroomSelect.value,
    teacherId: teacherSelect.value,
    dayOfWeek: parseInt(daySelect.value)
  };
  
  try {
    let response;
    
    if (currentCourse) {
      // 更新课程
      response = await fetch(`/api/courses/${currentCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentCourse, ...course })
      });
    } else {
      // 添加新课程
      response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(course)
      });
    }
    
    if (response.ok) {
      courseModal.style.display = 'none';
      fetchData();
    } else {
      const error = await response.json();
      alert(`操作失败: ${error.error}`);
    }
  } catch (error) {
    console.error('保存课程错误:', error);
    alert('保存课程失败，请查看控制台获取详情');
  }
});

// 删除课程按钮
deleteCourseBtn.addEventListener('click', async () => {
  if (!currentCourse || !confirm('确定要删除该课程吗？')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/courses/${currentCourse.id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      courseModal.style.display = 'none';
      fetchData();
    } else {
      const error = await response.json();
      alert(`删除失败: ${error.error}`);
    }
  } catch (error) {
    console.error('删除课程错误:', error);
    alert('删除课程失败，请查看控制台获取详情');
  }
});

// 添加学生按钮
addStudentsBtn.addEventListener('click', async () => {
  if (!currentCourse) return;
  
  const namesText = studentsBatchText.value.trim();
  
  if (!namesText) {
    alert('请输入学员姓名');
    return;
  }
  
  try {
    const response = await fetch(`/api/courses/${currentCourse.id}/students/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namesText })
    });
    
    if (response.ok) {
      studentsBatchText.value = '';
      fetchCourseStudents(currentCourse.id);
    } else {
      const error = await response.json();
      alert(`添加学员失败: ${error.error}`);
    }
  } catch (error) {
    console.error('添加学员错误:', error);
    alert('添加学员失败，请查看控制台获取详情');
  }
});

// 关闭模态框按钮
closeButtons.forEach(btn => {
  btn.addEventListener('click', function() {
    this.closest('.modal').style.display = 'none';
  });
});

// 点击模态框外部关闭
window.addEventListener('click', (e) => {
  if (e.target === courseModal) {
    courseModal.style.display = 'none';
  }
  
  if (e.target === batchCoursesModal) {
    batchCoursesModal.style.display = 'none';
  }
});

// 门店选择变化时更新教室选项
storeSelect.addEventListener('change', updateClassroomOptions);

// 初始化函数
async function init() {
  await fetchData();
  updateWeekDisplay();
  updateStoreOptions();
  updateTeacherOptions();
}

// 获取数据
async function fetchData() {
  try {
    // 并行请求所有数据
    const [storesRes, classroomsRes, teachersRes, coursesRes] = await Promise.all([
      fetch('/api/stores'),
      fetch('/api/classrooms'),
      fetch('/api/teachers'),
      fetch('/api/courses')
    ]);
    
    stores = await storesRes.json();
    classrooms = await classroomsRes.json();
    teachers = await teachersRes.json();
    courses = await coursesRes.json();
    
    updateSchedule();
  } catch (error) {
    console.error('获取数据错误:', error);
    alert('加载数据失败，请刷新页面重试');
  }
}

// 更新课程表
function updateSchedule() {
  updateWeekDisplay();
  
  // 清空课程表
  scheduleGrid.innerHTML = '';
  
  // 为每个门店创建行
  stores.forEach(store => {
    const storeClassrooms = classrooms.filter(c => c.storeId === store.id);
    
    // 为该门店的每个教室创建行
    storeClassrooms.forEach((classroom, index) => {
      const row = document.createElement('div');
      row.className = 'store-row';
      
      // 门店单元格（只在第一个教室行显示）
      const storeCell = document.createElement('div');
      storeCell.className = 'store-cell';
      if (index === 0) {
        storeCell.textContent = store.name;
        storeCell.style.gridRow = `span ${storeClassrooms.length}`;
      } else {
        storeCell.style.display = 'none';
      }
      row.appendChild(storeCell);
      
      // 教室单元格
      const classroomCell = document.createElement('div');
      classroomCell.className = 'classroom-cell';
      classroomCell.textContent = `${classroom.name}（${classroom.capacity}人）`;
      row.appendChild(classroomCell);
      
      // 星期单元格
      for (let day = 1; day <= 7; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        // 过滤出该门店、教室、星期的所有课程
        const dayCourses = courses.filter(course => 
          course.storeId === store.id && 
          course.classroomId === classroom.id && 
          course.dayOfWeek === day
        );
        
        // 添加课程项
        dayCourses.forEach(course => {
          const courseItem = document.createElement('div');
          courseItem.className = 'course-item';
          
          // 创建课程名称元素
          const courseName = document.createElement('div');
          courseName.className = 'course-name';
          courseName.textContent = course.name;
          
          // 创建学员人数元素
          const studentCount = document.createElement('div');
          studentCount.className = 'student-count';
          
          // 获取学员人数
          fetch(`/api/courses/${course.id}/students`)
            .then(response => response.json())
            .then(students => {
              studentCount.textContent = `${students.length}人`;
            })
            .catch(error => {
              console.error('获取学员人数错误:', error);
              studentCount.textContent = '0人';
            });
          
          courseItem.appendChild(courseName);
          courseItem.appendChild(studentCount);
          courseItem.dataset.courseId = course.id;
          
          // 双击课程查看详情
          courseItem.addEventListener('dblclick', () => {
            openCourseModal(course);
          });
          
          dayCell.appendChild(courseItem);
        });
        
        // 双击空白区域添加课程
        dayCell.addEventListener('dblclick', (e) => {
          if (e.target === dayCell) {
            openCourseModal(null, {
              storeId: store.id,
              classroomId: classroom.id,
              dayOfWeek: day
            });
          }
        });
        
        row.appendChild(dayCell);
      }
      
      scheduleGrid.appendChild(row);
    });
  });
}

// 打开课程模态框
async function openCourseModal(course = null, defaults = {}) {
  currentCourse = course;
  
  // 清空学生列表
  studentsList.innerHTML = '';
  
  // 更新标题
  modalTitle.textContent = course ? '编辑课程' : '添加课程';
  
  // 更新删除按钮显示状态
  deleteCourseBtn.style.display = course ? 'block' : 'none';
  
  // 填充表单
  if (course) {
    courseNameInput.value = course.name;
    storeSelect.value = course.storeId;
    updateClassroomOptions();
    classroomSelect.value = course.classroomId;
    teacherSelect.value = course.teacherId;
    daySelect.value = course.dayOfWeek;
    
    // 获取并显示课程的学生
    await fetchCourseStudents(course.id);
  } else {
    courseForm.reset();
    
    // 如果有默认值则设置
    if (defaults.storeId) {
      storeSelect.value = defaults.storeId;
      updateClassroomOptions();
      
      if (defaults.classroomId) {
        classroomSelect.value = defaults.classroomId;
      }
    }
    
    if (defaults.dayOfWeek) {
      daySelect.value = defaults.dayOfWeek;
    }
  }
  
  // 显示模态框
  courseModal.style.display = 'block';
}

// 获取课程的学生
async function fetchCourseStudents(courseId) {
  try {
    const response = await fetch(`/api/courses/${courseId}/students`);
    const students = await response.json();
    
    // 清空学生列表
    studentsList.innerHTML = '';
    
    // 显示学生
    if (students.length === 0) {
      studentsList.innerHTML = '<div class="empty-message">暂无学员</div>';
    } else {
      students.forEach(student => {
        const studentItem = document.createElement('div');
        studentItem.className = 'student-item';
        
        const studentName = document.createElement('span');
        studentName.textContent = student.name;
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-student';
        removeBtn.textContent = '×';
        removeBtn.title = '移除学员';
        
        // 点击移除学生
        removeBtn.addEventListener('click', async () => {
          if (confirm(`确定要移除学员 ${student.name} 吗？`)) {
            await removeStudentFromCourse(courseId, student.id);
          }
        });
        
        studentItem.appendChild(studentName);
        studentItem.appendChild(removeBtn);
        studentsList.appendChild(studentItem);
      });
    }
  } catch (error) {
    console.error('获取学员错误:', error);
    studentsList.innerHTML = '<div class="error-message">获取学员失败</div>';
  }
}

// 从课程中移除学生
async function removeStudentFromCourse(courseId, studentId) {
  try {
    const response = await fetch(`/api/courses/${courseId}/students/${studentId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      fetchCourseStudents(courseId);
    } else {
      const error = await response.json();
      alert(`移除学员失败: ${error.error}`);
    }
  } catch (error) {
    console.error('移除学员错误:', error);
    alert('移除学员失败，请查看控制台获取详情');
  }
}

// 更新周显示
function updateWeekDisplay() {
  const endDate = new Date(currentWeekStart);
  endDate.setDate(endDate.getDate() + 6);
  
  const startStr = formatDate(currentWeekStart);
  const endStr = formatDate(endDate);
  
  currentWeekEl.textContent = `${startStr} - ${endStr}`;
}

// 更新门店选择项
function updateStoreOptions() {
  storeSelect.innerHTML = '<option value="">请选择门店</option>';
  
  stores.forEach(store => {
    const option = document.createElement('option');
    option.value = store.id;
    option.textContent = store.name;
    storeSelect.appendChild(option);
  });
}

// 更新教室选择项
function updateClassroomOptions() {
  const storeId = storeSelect.value;
  
  classroomSelect.innerHTML = '<option value="">请选择教室</option>';
  
  if (!storeId) return;
  
  const storeClassrooms = classrooms.filter(c => c.storeId === storeId);
  
  storeClassrooms.forEach(classroom => {
    const option = document.createElement('option');
    option.value = classroom.id;
    option.textContent = classroom.name;
    classroomSelect.appendChild(option);
  });
}

// 更新教师选择项
function updateTeacherOptions() {
  teacherSelect.innerHTML = '<option value="">请选择教师</option>';
  
  teachers.forEach(teacher => {
    const option = document.createElement('option');
    option.value = teacher.id;
    option.textContent = teacher.name;
    teacherSelect.appendChild(option);
  });
}

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