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
const storeFilterSelect = document.getElementById('store-filter');
const courseSearchInput = document.getElementById('course-search');
const searchBtn = document.getElementById('search-btn');

// 课程模态框元素
const courseModal = document.getElementById('course-modal');
const courseForm = document.getElementById('course-form');
const courseNameInput = document.getElementById('course-name');
const storeSelect = document.getElementById('store-select');
const classroomSelect = document.getElementById('classroom-select');
const teacherSelect = document.getElementById('teacher-select');
const dateSelect = document.getElementById('date-select');
const weeksCountInput = document.getElementById('weeks-count');
const confirmCourseBtn = document.getElementById('confirm-course-btn');
const saveCourseBtn = document.getElementById('save-course-btn');
const deleteCourseBtn = document.getElementById('delete-course-btn');
const modalTitle = document.getElementById('modal-title');
const studentsList = document.getElementById('students-list');
const studentsBatchText = document.getElementById('students-batch');
const addStudentsBtn = document.getElementById('add-students-btn');
const printAttendanceBtn = document.getElementById('print-attendance-btn');
const attendancePrint = document.getElementById('attendance-print');

// 批量添加课程模态框元素
const batchCoursesModal = document.getElementById('batch-courses-modal');
const coursesBatchText = document.getElementById('courses-batch');
const submitBatchCoursesBtn = document.getElementById('submit-batch-courses');

// 模态框关闭按钮
const closeButtons = document.querySelectorAll('.close');

// 筛选相关变量
let selectedStoreIds = ['all']; // 默认选中"全部门店"
let courseSearchText = ''; // 课程搜索文本

// 初始化应用
document.addEventListener('DOMContentLoaded', init);

// 周导航事件监听
prevWeekBtn.addEventListener('click', () => {
  const prevWeek = new Date(currentWeekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  currentWeekStart = getWeekStart(prevWeek);
  updateSchedule();
  updateHeaderDates();
});

nextWeekBtn.addEventListener('click', () => {
  const nextWeek = new Date(currentWeekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  currentWeekStart = getWeekStart(nextWeek);
  updateSchedule();
  updateHeaderDates();
});

// 添加课程按钮
addCourseBtn.addEventListener('click', () => {
  openCourseModal();
});

// 打印签到表按钮
printAttendanceBtn.addEventListener('click', () => {
  if (currentCourse) {
    generateAttendanceSheet(currentCourse);
  }
});

// 批量添加课程按钮
batchAddCoursesBtn.addEventListener('click', () => {
  batchCoursesModal.style.display = 'block';
});

// 确认开课按钮
confirmCourseBtn.addEventListener('click', async () => {
  if (!currentCourse) {
    alert('请先保存课程');
    return;
  }
  
  const weeksCount = parseInt(prompt('请输入占用后续周数:', '4'), 10);
  if (isNaN(weeksCount) || weeksCount < 1) {
    alert('请输入有效的周数');
    return;
  }
  
  try {
    const response = await fetch(`/api/courses/${currentCourse.id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        weeksCount,
        parentCourseId: currentCourse.id
      })
    });
    
    if (response.ok) {
      alert('课程已确认开课，已为后续周创建占位');
      courseModal.style.display = 'none';
      fetchData();
    } else {
      const error = await response.json();
      alert(`确认开课失败: ${error.error}`);
    }
  } catch (error) {
    console.error('确认开课错误:', error);
    alert('确认开课失败，请查看控制台获取详情');
  }
});

// 提交批量添加课程
submitBatchCoursesBtn.addEventListener('click', async () => {
  const batchText = coursesBatchText.value.trim();
  
  if (!batchText) {
    alert('请输入课程信息');
    return;
  }
  
  console.log('准备发送批量添加课程请求...');
  console.log('批量文本内容:', batchText);
  
  try {
    // 显示请求等待提示
    submitBatchCoursesBtn.disabled = true;
    submitBatchCoursesBtn.textContent = '提交中...';
    
    console.log('开始发送请求...');
    const response = await fetch('/api/courses/batch', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ batchText })
    });
    
    console.log('收到响应:', response.status, response.statusText);
    
    // 尝试获取响应文本
    let responseText = '';
    try {
      responseText = await response.text();
      console.log('响应文本:', responseText);
    } catch (textError) {
      console.error('读取响应文本失败:', textError);
    }
    
    let result;
    try {
      // 尝试解析JSON
      result = responseText ? JSON.parse(responseText) : {};
      console.log('解析后的响应:', result);
    } catch (parseError) {
      console.error('解析JSON失败:', parseError);
      alert(`解析响应失败: ${responseText}`);
      submitBatchCoursesBtn.disabled = false;
      submitBatchCoursesBtn.textContent = '提交';
      return;
    }
    
    if (response.ok) {
      console.log('批量添加成功，添加了', result.length, '个课程');
      alert('批量添加课程成功');
      batchCoursesModal.style.display = 'none';
      coursesBatchText.value = '';
      fetchData();
    } else {
      const errorMsg = result.errors 
        ? result.errors.join('\n') 
        : (result.error || response.statusText || '未知错误');
      console.error('批量添加失败:', errorMsg);
      alert(`批量添加失败: ${errorMsg}`);
    }
  } catch (error) {
    console.error('批量添加课程发生错误:', error);
    alert(`批量添加课程失败: ${error.message}\n请查看控制台获取详情`);
  } finally {
    // 恢复按钮状态
    submitBatchCoursesBtn.disabled = false;
    submitBatchCoursesBtn.textContent = '提交';
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
    date: dateSelect.value
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

// 门店筛选变化时更新课程表格
storeFilterSelect.addEventListener('change', function() {
  // 获取选中的选项值
  const selectedValue = this.value;
  
  // 更新选中的门店ID数组
  selectedStoreIds = [selectedValue];
  
  console.log('选中的门店ID:', selectedValue);
  updateSchedule();
});

// 搜索按钮点击事件
searchBtn.addEventListener('click', function() {
  courseSearchText = courseSearchInput.value.trim();
  console.log('搜索课程:', courseSearchText);
  updateSchedule();
});

// 搜索框回车事件
courseSearchInput.addEventListener('keyup', function(event) {
  if (event.key === 'Enter') {
    courseSearchText = this.value.trim();
    console.log('搜索课程:', courseSearchText);
    updateSchedule();
  }
});

// 清除搜索
courseSearchInput.addEventListener('input', function() {
  if (this.value.trim() === '' && courseSearchText !== '') {
    courseSearchText = '';
    updateSchedule();
  }
});

// 初始化函数
async function init() {
  console.log('初始化应用程序...');
  try {
    // 确保当前周的日期设置正确
    currentWeekStart = getWeekStart(new Date());
    console.log('当前周开始日期:', formatDate(currentWeekStart));
    
    await fetchData();
    console.log('数据获取完成，更新周显示...');
    updateWeekDisplay();
    console.log('更新门店选项...');
    updateStoreOptions();
    console.log('更新教师选项...');
    updateTeacherOptions();
    
    // 更新表头的日期显示
    updateHeaderDates();
    
    console.log('初始化完成！');
  } catch (error) {
    console.error('初始化失败:', error);
    alert('初始化应用程序失败，请刷新页面重试');
  }
}

// 获取数据
async function fetchData() {
  try {
    console.log('开始获取所有数据...');
    
    // 并行请求所有数据
    console.log('发送请求到 /api/stores');
    const storesRes = await fetch('/api/stores');
    console.log('收到门店响应:', storesRes.status, storesRes.statusText);
    
    console.log('发送请求到 /api/classrooms');
    const classroomsRes = await fetch('/api/classrooms');
    console.log('收到教室响应:', classroomsRes.status, classroomsRes.statusText);
    
    console.log('发送请求到 /api/teachers');
    const teachersRes = await fetch('/api/teachers');
    console.log('收到教师响应:', teachersRes.status, teachersRes.statusText);
    
    console.log('发送请求到 /api/courses');
    const coursesRes = await fetch('/api/courses');
    console.log('收到课程响应:', coursesRes.status, coursesRes.statusText);
    
    // 解析响应数据
    try {
      stores = await storesRes.json();
      console.log('门店数据:', stores);
    } catch (e) {
      console.error('解析门店数据失败:', e);
      stores = [];
    }
    
    try {
      classrooms = await classroomsRes.json();
      console.log('教室数据:', classrooms);
    } catch (e) {
      console.error('解析教室数据失败:', e);
      classrooms = [];
    }
    
    try {
      teachers = await teachersRes.json();
      console.log('教师数据:', teachers);
    } catch (e) {
      console.error('解析教师数据失败:', e);
      teachers = [];
    }
    
    try {
      courses = await coursesRes.json();
      console.log('课程数据:', courses);
    } catch (e) {
      console.error('解析课程数据失败:', e);
      courses = [];
    }
    
    console.log('所有数据获取完成，更新课程表...');
    updateSchedule();
  } catch (error) {
    console.error('获取数据错误:', error);
    alert('加载数据失败，请刷新页面重试');
  }
}

// 更新课程表
function updateSchedule() {
  console.log('更新课程表...');
  updateWeekDisplay();
  
  // 清空课程表
  scheduleGrid.innerHTML = '';
  
  console.log('当前周开始日期:', formatDate(currentWeekStart));
  const weekEndDate = new Date(currentWeekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  console.log('当前周结束日期:', formatDate(weekEndDate));
  
  console.log('当前门店数量:', stores.length);
  console.log('当前教室数量:', classrooms.length);
  console.log('当前课程数量:', courses.length);
  
  // 根据搜索文本筛选课程
  let searchMatchingCourses = [];
  if (courseSearchText) {
    searchMatchingCourses = courses.filter(course => {
      const courseName = course.name ? course.name.toLowerCase() : '';
      const searchText = courseSearchText.toLowerCase();
      const isMatch = courseName.includes(searchText);
      console.log(`检查课程 "${course.name}" 是否匹配 "${courseSearchText}": ${isMatch}`);
      return isMatch;
    });
    console.log(`根据搜索文本 "${courseSearchText}" 筛选课程，匹配 ${searchMatchingCourses.length} 个课程`);
  }
  
  // 筛选要显示的门店
  let storesToDisplay = stores;
  if (!selectedStoreIds.includes('all')) {
    storesToDisplay = stores.filter(store => selectedStoreIds.includes(store.id));
    console.log(`已筛选门店，显示 ${storesToDisplay.length} 个门店`);
  }
  
  // 为每个门店创建行
  storesToDisplay.forEach(store => {
    const storeClassrooms = classrooms.filter(c => c.storeId === store.id);
    console.log(`处理门店: ${store.name}, 教室数量: ${storeClassrooms.length}`);
    
    // 检查是否有匹配的课程在这个门店
    if (courseSearchText) {
      const matchingStoreCoursesCount = searchMatchingCourses.filter(course => course.storeId === store.id).length;
      if (matchingStoreCoursesCount === 0) {
        console.log(`门店 ${store.name} 没有匹配的课程，跳过`);
        return; // 跳过没有匹配课程的门店
      } else {
        console.log(`门店 ${store.name} 有 ${matchingStoreCoursesCount} 个匹配的课程`);
      }
    }
    
    // 为该门店的每个教室创建行
    storeClassrooms.forEach(classroom => {
      // 如果有搜索文本，检查该教室是否有匹配的课程
      if (courseSearchText) {
        // 查找该教室一周内的所有课程中，是否有匹配搜索文本的课程
        const classroomCourses = courses.filter(course => 
          course.storeId === store.id && 
          course.classroomId === classroom.id
        );
        
        // 检查该教室是否有匹配课程
        const hasMatchingCourse = classroomCourses.some(course => 
          course.name && 
          course.name.toLowerCase().includes(courseSearchText.toLowerCase())
        );
        
        // 如果该教室没有匹配的课程，跳过这个教室
        if (!hasMatchingCourse) {
          console.log(`教室 ${classroom.name} 没有匹配的课程，跳过`);
          return; // 跳过这个教室
        } else {
          console.log(`教室 ${classroom.name} 有匹配的课程，显示`);
        }
      }
      
      const row = document.createElement('div');
      row.className = 'store-row';
      
      // 门店单元格（每行都显示）
      const storeCell = document.createElement('div');
      storeCell.className = 'store-cell';
      storeCell.textContent = store.name;
      row.appendChild(storeCell);
      
      // 教室单元格
      const classroomCell = document.createElement('div');
      classroomCell.className = 'classroom-cell';
      classroomCell.textContent = `${classroom.name}（${classroom.capacity || '-'}人）`;
      row.appendChild(classroomCell);
      
      // 星期单元格
      for (let day = 1; day <= 7; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        // 计算当前星期几对应的日期
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentDate.getDate() + day - 1);
        const dateStr = formatDate(currentDate);
        
        // 给单元格添加日期标识，方便调试
        dayCell.dataset.date = dateStr;
        
        // 获取该单元格对应的所有课程（不进行搜索过滤）
        let dayCourses = courses.filter(course => 
          course.storeId === store.id && 
          course.classroomId === classroom.id && 
          course.date === dateStr
        );
        
        console.log(`检查 ${store.name} ${classroom.name} ${dateStr} 的课程: 找到 ${dayCourses.length} 个`);
        
        // 添加课程项
        dayCourses.forEach(course => {
          const courseItem = document.createElement('div');
          courseItem.className = 'course-item';
          
          // 如果匹配搜索文本，添加高亮样式
          const isMatching = courseSearchText && course.name && 
            course.name.toLowerCase().includes(courseSearchText.toLowerCase());
          
          if (isMatching) {
            courseItem.classList.add('search-highlight');
          }
          
          // 创建课程名称元素
          const courseName = document.createElement('div');
          courseName.className = 'course-name';
          
          // 如果存在搜索文本且课程名称匹配，高亮显示匹配的部分
          if (isMatching) {
            try {
              // 使用正则表达式转义特殊字符
              const escapedSearchText = courseSearchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`(${escapedSearchText})`, 'gi');
              
              // 分离课程名称和进度信息
              let displayName = course.name;
              let progressInfo = '';
              
              if (course.isPlaceholder && course.currentWeek && course.totalWeeks) {
                progressInfo = `(${course.currentWeek}/${course.totalWeeks})`;
              } else if (course.totalWeeks && course.currentWeek) {
                progressInfo = `(${course.currentWeek}/${course.totalWeeks})`;
              }
              
              // 只对课程名称部分进行高亮处理
              courseName.innerHTML = displayName.replace(regex, '<span class="highlight-text">$1</span>');
              if (progressInfo) {
                courseName.innerHTML += ' ' + progressInfo;
              }
              
              console.log(`高亮显示课程 "${course.name}" 中的 "${courseSearchText}"`);
            } catch (e) {
              console.error(`高亮显示错误:`, e);
              courseName.textContent = course.name;
            }
          } else {
            // 如果是占位课程，显示格式为"课程名(当前周次/总周次)"
            if (course.isPlaceholder && course.currentWeek && course.totalWeeks) {
              courseName.textContent = `${course.name}(${course.currentWeek}/${course.totalWeeks})`;
              courseItem.classList.add('placeholder-course');
            } else if (course.totalWeeks && course.currentWeek) {
              // 如果是已确认开课的课程
              courseName.textContent = `${course.name}(${course.currentWeek}/${course.totalWeeks})`;
              courseItem.classList.add('confirmed-course');
            } else {
              courseName.textContent = course.name || '';
            }
          }
          
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
          courseItem.dataset.date = course.date;
          
          // 双击课程查看详情
          courseItem.addEventListener('dblclick', () => {
            openCourseModal(course);
          });
          
          dayCell.appendChild(courseItem);
        });
        
        // 双击空白区域添加课程
        dayCell.addEventListener('dblclick', (e) => {
          if (e.target === dayCell) {
            const currentDate = new Date(currentWeekStart);
            currentDate.setDate(currentDate.getDate() + day - 1);
            const formattedDate = formatDate(currentDate);
            console.log(`添加课程在 ${store.name} ${classroom.name} ${formattedDate}`);
            openCourseModal(null, {
              storeId: store.id,
              classroomId: classroom.id,
              date: formattedDate
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
  
  console.log('打开课程模态框', course ? '编辑课程' : '添加课程');
  if (course) {
    console.log('课程数据:', course);
  } else if (defaults) {
    console.log('默认数据:', defaults);
  }
  
  // 清空学生列表
  studentsList.innerHTML = '';
  
  // 更新标题
  modalTitle.textContent = course ? '编辑课程' : '添加课程';
  
  // 更新删除按钮显示状态
  deleteCourseBtn.style.display = course ? 'block' : 'none';
  
  // 确认开课按钮的显示状态
  confirmCourseBtn.style.display = 'block';
  
  // 处理占位课程
  if (course && course.isPlaceholder && course.parentCourseId) {
    // 占位课程不能确认开课
    confirmCourseBtn.style.display = 'none';
    
    // 添加一个查看原始课程的链接
    const dateGroup = dateSelect.closest('.form-group');
    
    // 移除已有的原始课程链接（如果有）
    const existingLink = document.querySelector('.original-course-link');
    if (existingLink) {
      existingLink.remove();
    }
    
    // 创建原始课程链接
    const originalCourseLink = document.createElement('div');
    originalCourseLink.className = 'original-course-link';
    originalCourseLink.innerHTML = `<a href="#" class="view-original-course">查看原始课程</a>`;
    
    // 点击链接时打开原始课程
    originalCourseLink.querySelector('.view-original-course').addEventListener('click', async (e) => {
      e.preventDefault();
      
      try {
        const response = await fetch(`/api/courses/${course.parentCourseId}`);
        if (response.ok) {
          const parentCourse = await response.json();
          // 关闭当前模态框
          courseModal.style.display = 'none';
          // 打开原始课程的模态框
          setTimeout(() => openCourseModal(parentCourse), 100);
        } else {
          alert('获取原始课程失败');
        }
      } catch (error) {
        console.error('获取原始课程数据错误:', error);
        alert('获取原始课程失败，请查看控制台获取详情');
      }
    });
    
    dateGroup.appendChild(originalCourseLink);
  }
  
  // 填充表单
  if (course) {
    courseNameInput.value = course.name;
    storeSelect.value = course.storeId;
    updateClassroomOptions();
    classroomSelect.value = course.classroomId;
    teacherSelect.value = course.teacherId;
    
    // 设置日期
    if (course.date) {
      dateSelect.value = course.date;
      console.log('设置课程日期:', course.date);
    }
    
    // 如果课程已确认开课，显示周次信息
    if (course.totalWeeks && course.currentWeek) {
      const weekInfo = document.createElement('div');
      weekInfo.className = 'week-info';
      weekInfo.innerHTML = `<strong>课程进度: </strong>第${course.currentWeek}周 / 共${course.totalWeeks}周`;
      
      const dateGroup = dateSelect.closest('.form-group');
      if (dateGroup.querySelector('.week-info')) {
        dateGroup.querySelector('.week-info').remove();
      }
      dateGroup.appendChild(weekInfo);
    }
    
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
    
    // 设置默认日期
    if (defaults.date) {
      dateSelect.value = defaults.date;
      console.log('设置默认日期:', defaults.date);
    } else {
      // 如果没有默认日期，设置为今天
      const today = new Date();
      dateSelect.value = formatDate(today);
      console.log('设置今天日期:', formatDate(today));
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
          await removeStudentFromCourse(courseId, student.id);
        });
        
        studentItem.appendChild(studentName);
        studentItem.appendChild(removeBtn);
        studentsList.appendChild(studentItem);
      });
    }
    
    // 保存学生列表用于打印签到表
    if (currentCourse) {
      currentCourse.studentsList = students;
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
  
  console.log(`更新周显示: ${startStr} - ${endStr}`);
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
  
  // 更新筛选门店的下拉框
  updateStoreFilterOptions();
}

// 更新门店筛选选项
function updateStoreFilterOptions() {
  // 保留"全部门店"选项
  storeFilterSelect.innerHTML = '<option value="all">全部门店</option>';
  
  stores.forEach(store => {
    const option = document.createElement('option');
    option.value = store.id;
    option.textContent = store.name;
    storeFilterSelect.appendChild(option);
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

// 生成并打印签到表
async function generateAttendanceSheet(course) {
  try {
    // 获取门店、教室、教师信息
    const store = stores.find(s => s.id === course.storeId);
    const classroom = classrooms.find(c => c.id === course.classroomId);
    const teacher = teachers.find(t => t.id === course.teacherId);
    
    // 获取课程日期对应的星期几
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const courseDate = new Date(course.date);
    const weekday = weekdays[courseDate.getDay()];
    
    // 创建签到表HTML
    const html = `
      <div class="attendance-header">
        <h1>${course.name}-新青年夜校上课签到表</h1>
        <div class="attendance-info">上课地点: ${store ? store.name : ''}${classroom ? ' ' + classroom.name : ''}</div>
        <div class="attendance-info">上课时间: 每周${weekday}19:00-20:30</div>
        <div class="attendance-info">上课须知: 第一节课（前45分钟）为试听时间，同学不满意可自行离开，从原购买渠道申请退学费即可，45分钟后视为对此课程满意，满意的话后续将不再退换补课</div>
      </div>
      
      <table class="attendance-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>电话</th>
            ${generateDateHeaders(course.date)}
          </tr>
        </thead>
        <tbody>
          ${generateStudentRows(course)}
        </tbody>
      </table>
    `;
    
    // 更新打印区域内容
    attendancePrint.innerHTML = html;
    
    // 打印
    window.print();
  } catch (error) {
    console.error('生成签到表错误:', error);
    alert('生成签到表失败，请查看控制台获取详情');
  }
}

// 生成日期表头（当前周和未来几周）
function generateDateHeaders(dateStr) {
  // 生成当前周和未来4周的日期
  let headers = '';
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const date = new Date(dateStr);
  
  // 获取当前课程的星期几
  const currentDay = date.getDay() || 7; // 将周日的0转换为7
  const weekdayName = weekdays[currentDay - 1];
  
  // 添加当前日期
  const month = date.getMonth() + 1;
  const day = date.getDate();
  headers += `<th>${weekdayName}(${month}.${day})</th>`;
  
  // 添加未来四周的日期
  for (let i = 0; i < 4; i++) {
    date.setDate(date.getDate() + 7); // 下一周的同一天
    const nextMonth = date.getMonth() + 1;
    const nextDay = date.getDate();
    headers += `<th>${weekdayName}(${nextMonth}.${nextDay})</th>`;
  }
  
  return headers;
}

// 生成学生行
function generateStudentRows(course) {
  let rows = '';
  
  if (!course.studentsList || course.studentsList.length === 0) {
    rows = `<tr><td colspan="7" style="text-align: center;">暂无学员</td></tr>`;
  } else {
    rows = course.studentsList.map(student => `
      <tr style="height: 35px;">
        <td style="white-space: nowrap; height: 35px;">${student.name}</td>
        <td style="white-space: nowrap; height: 35px;"></td>
        <td style="height: 35px;"></td>
        <td style="height: 35px;"></td>
        <td style="height: 35px;"></td>
        <td style="height: 35px;"></td>
        <td style="height: 35px;"></td>
      </tr>
    `).join('');
  }
  
  // 固定添加10行空白行
  for (let i = 0; i < 10; i++) {
    rows += `
      <tr style="height: 35px;">
        <td style="white-space: nowrap; height: 35px;"></td>
        <td style="white-space: nowrap; height: 35px;"></td>
        <td style="height: 35px;"></td>
        <td style="height: 35px;"></td>
        <td style="height: 35px;"></td>
        <td style="height: 35px;"></td>
        <td style="height: 35px;"></td>
      </tr>
    `;
  }
  
  return rows;
}

// 更新表头日期显示
function updateHeaderDates() {
  const dayHeaders = document.querySelectorAll('.day-header');
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 格式化为"周几（月.日）"，比如"周一（3.24）"
    dayHeaders[i].textContent = `${weekdays[i]}（${month}.${day}）`;
  }
} 