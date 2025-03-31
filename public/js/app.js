// 全局变量
let stores = [];
let classrooms = [];
let teachers = [];
let courses = [];
let students = [];
let currentCourse = null;
let currentWeekStart = getWeekStart(new Date());
let currentUploadFile = null; // 当前上传文件

// DOM 元素
const scheduleGrid = document.getElementById('schedule-grid');
const currentWeekEl = document.getElementById('current-week');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const addCourseBtn = document.getElementById('add-course-btn');
const batchAddCoursesBtn = document.getElementById('batch-add-courses-btn');
const storeFilterContainer = document.getElementById('store-filter-container');
const storeFilterSelected = document.getElementById('store-filter-selected');
const storeFilterOptions = document.getElementById('store-filter-options');
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

// 签到表上传元素
const uploadDropzone = document.getElementById('upload-dropzone');
const fileUploadInput = document.getElementById('file-upload');
const pasteArea = document.getElementById('paste-area');
const qrcodeUpload = document.getElementById('qrcode-upload');
const uploadQrcode = document.getElementById('upload-qrcode');
const uploadPreviewContainer = document.getElementById('upload-preview-container');
const uploadPreview = document.getElementById('upload-preview');
const confirmUploadBtn = document.getElementById('confirm-upload-btn');
const cancelUploadBtn = document.getElementById('cancel-upload-btn');
const recordsList = document.getElementById('records-list');

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
      // 更新课程 - 创建更新对象，但不包含studentsList字段
      const { studentsList, ...courseWithoutStudents } = currentCourse;
      
      response = await fetch(`/api/courses/${currentCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...courseWithoutStudents, ...course })
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
  console.log('添加学员按钮被点击');
  
  if (!currentCourse) {
    console.error('当前没有选中的课程');
    alert('请先选择一个课程');
    return;
  }
  
  const namesText = studentsBatchText.value.trim();
  console.log('输入的学员名单:', namesText);
  
  if (!namesText) {
    alert('请输入学员姓名');
    return;
  }
  
  try {
    console.log(`准备向课程 ${currentCourse.id} 添加学员`);
    const response = await fetch(`/api/courses/${currentCourse.id}/students/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namesText })
    });
    
    console.log('服务器响应状态:', response.status, response.statusText);
    
    if (response.ok) {
      studentsBatchText.value = '';
      showToast('学员添加成功', 'success-toast');
      await fetchCourseStudents(currentCourse.id);
    } else {
      const error = await response.json();
      console.error('添加学员失败:', error);
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
storeFilterContainer.addEventListener('click', function(e) {
  this.classList.toggle('open');
  e.stopPropagation();
});

// 点击页面其他地方关闭下拉框
document.addEventListener('click', function() {
  storeFilterContainer.classList.remove('open');
});

// 阻止下拉选项点击事件冒泡
storeFilterOptions.addEventListener('click', function(e) {
  e.stopPropagation();
});

// 处理多选框选择变化
storeFilterOptions.addEventListener('change', function(e) {
  if (e.target.matches('[data-store-option]')) {
    // 如果点击的是"全部门店"选项
    if (e.target.value === 'all') {
      // 如果选中"全部门店"，取消其他所有选项
      if (e.target.checked) {
        const checkboxes = storeFilterOptions.querySelectorAll('input[data-store-option]:not([value="all"])');
        checkboxes.forEach(checkbox => {
          checkbox.checked = false;
        });
        selectedStoreIds = ['all'];
      } else {
        // 不允许取消选择"全部门店"，除非选择了其他选项
        e.target.checked = true;
      }
    } else {
      // 如果点击的是其他选项
      const allOption = storeFilterOptions.querySelector('input[data-store-option][value="all"]');
      
      // 获取所有选中的非"全部"选项
      const selectedOptions = Array.from(
        storeFilterOptions.querySelectorAll('input[data-store-option]:checked:not([value="all"])')
      );
      
      if (selectedOptions.length > 0) {
        // 如果有其他选项被选中，取消"全部门店"
        allOption.checked = false;
        // 更新选中的门店ID数组
        selectedStoreIds = selectedOptions.map(option => option.value);
      } else {
        // 如果没有其他选项被选中，默认选中"全部门店"
        allOption.checked = true;
        selectedStoreIds = ['all'];
      }
    }
    
    // 更新显示的选中文本
    updateSelectedStoresText();
    
    // 更新课程表
    updateSchedule();
  }
});

// 更新选中门店的显示文本
function updateSelectedStoresText() {
  if (selectedStoreIds.includes('all')) {
    storeFilterSelected.textContent = '全部门店';
  } else if (selectedStoreIds.length === 1) {
    const store = stores.find(s => s.id === selectedStoreIds[0]);
    storeFilterSelected.textContent = store ? store.name : '选择门店';
  } else {
    storeFilterSelected.textContent = `已选择 ${selectedStoreIds.length} 个门店`;
  }
}

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
    console.log('更新门店筛选选项...');
    updateStoreFilterOptions();
    console.log('更新教师选项...');
    updateTeacherOptions();
    
    // 更新表头的日期显示
    updateHeaderDates();
    
    // 初始化上传控件
    initUploadHandlers();
    
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
        dayCell.dataset.storeId = store.id;
        dayCell.dataset.classroomId = classroom.id;
        
        // 获取当前日期
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentDate.getDate() + day - 1);
        const formattedDate = formatDate(currentDate);
        dayCell.dataset.date = formattedDate;
        
        // 允许放置拖拽的课程
        dayCell.addEventListener('dragover', handleDragOver);
        dayCell.addEventListener('drop', handleDrop);
        
        // 获取该单元格对应的所有课程（不进行搜索过滤）
        let dayCourses = courses.filter(course => 
          course.storeId === store.id && 
          course.classroomId === classroom.id && 
          course.date === formattedDate
        );
        
        console.log(`检查 ${store.name} ${classroom.name} ${formattedDate} 的课程: 找到 ${dayCourses.length} 个`);
        
        // 添加课程项
        dayCourses.forEach(course => {
          const courseItem = document.createElement('div');
          courseItem.className = 'course-item';
          
          // 设置为可拖拽
          courseItem.draggable = true;
          courseItem.dataset.courseId = course.id;
          courseItem.dataset.date = course.date;
          courseItem.dataset.storeId = course.storeId;
          courseItem.dataset.classroomId = course.classroomId;
          
          // 添加拖拽事件处理
          courseItem.addEventListener('dragstart', handleDragStart);
          courseItem.addEventListener('dragend', handleDragEnd);
          
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
          
          // 创建学员人数和教师元素
          const infoSection = document.createElement('div');
          infoSection.className = 'course-info';
          
          // 获取教师姓名
          const teacher = teachers.find(t => t.id === course.teacherId);
          const teacherName = teacher ? teacher.name : '';
          
          // 创建学员人数元素
          fetch(`/api/courses/${course.id}/students`)
            .then(response => response.json())
            .then(students => {
              infoSection.innerHTML = `
                <span class="student-count">${students.length}人</span>
                ${teacherName ? `<span class="teacher-name">${teacherName}</span>` : ''}
              `;
            })
            .catch(error => {
              console.error('获取学员人数错误:', error);
              infoSection.innerHTML = `
                <span class="student-count">0人</span>
                ${teacherName ? `<span class="teacher-name">${teacherName}</span>` : ''}
              `;
            });
          
          courseItem.appendChild(courseName);
          courseItem.appendChild(infoSection);
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

// 拖拽开始处理函数
function handleDragStart(e) {
  // 设置拖拽数据
  e.dataTransfer.setData('text/plain', JSON.stringify({
    courseId: this.dataset.courseId,
    storeId: this.dataset.storeId,
    classroomId: this.dataset.classroomId,
    date: this.dataset.date
  }));
  
  // 添加拖拽样式
  this.classList.add('dragging');
  
  // 显示拖拽提示
  showToast('拖动课程到目标位置...', 'info-toast');
}

// 拖拽结束处理函数
function handleDragEnd(e) {
  this.classList.remove('dragging');
}

// 拖拽经过目标区域处理函数
function handleDragOver(e) {
  // 阻止默认行为，允许放置
  e.preventDefault();
  
  // 添加拖拽目标样式
  this.classList.add('drag-over');
  
  // 如果用户在一个区域停留超过500ms，显示提示
  clearTimeout(this.dragoverTimeout);
  this.dragoverTimeout = setTimeout(() => {
    const storeObj = stores.find(s => s.id === this.dataset.storeId);
    const classroomObj = classrooms.find(c => c.id === this.dataset.classroomId);
    if (storeObj && classroomObj) {
      showToast(`放置于: ${storeObj.name} - ${classroomObj.name} - ${this.dataset.date}`, 'info-toast', 1000);
    }
  }, 500);
  
  // 移除样式的事件
  this.addEventListener('dragleave', function() {
    this.classList.remove('drag-over');
    clearTimeout(this.dragoverTimeout);
  }, { once: true });
}

// 放置处理函数
function handleDrop(e) {
  e.preventDefault();
  
  // 移除拖拽目标样式
  this.classList.remove('drag-over');
  clearTimeout(this.dragoverTimeout);
  
  try {
    // 获取拖拽数据
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const courseId = data.courseId;
    
    // 获取目标单元格数据
    const targetStoreId = this.dataset.storeId;
    const targetClassroomId = this.dataset.classroomId;
    const targetDate = this.dataset.date;
    
    // 如果拖拽到相同位置，不做任何处理
    if (data.storeId === targetStoreId && 
        data.classroomId === targetClassroomId && 
        data.date === targetDate) {
      showToast('课程位置未变更', 'info-toast');
      return;
    }
    
    // 获取目标位置信息用于显示提示
    const storeName = stores.find(s => s.id === targetStoreId)?.name || '未知门店';
    const classroomName = classrooms.find(c => c.id === targetClassroomId)?.name || '未知教室';
    
    // 直接调用API更新课程
    updateCoursePosition(courseId, targetStoreId, targetClassroomId, targetDate);
    
    // 显示移动成功提示
    showToast(`课程已移至: ${storeName} - ${classroomName} - ${targetDate}`, 'info-toast');
  } catch (error) {
    console.error('放置处理错误:', error);
    showToast('拖拽操作失败', 'error-toast');
  }
}

// 更新课程位置的API调用
async function updateCoursePosition(courseId, storeId, classroomId, date) {
  try {
    // 首先获取课程当前数据
    const response = await fetch(`/api/courses/${courseId}`);
    const course = await response.json();
    
    // 准备更新数据
    const updatedCourse = {
      ...course,
      storeId,
      classroomId,
      date
    };
    
    // 发送更新请求
    const updateResponse = await fetch(`/api/courses/${courseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedCourse)
    });
    
    if (updateResponse.ok) {
      // 如果是占位课程，可能需要更新其余的占位课程
      if (course.isPlaceholder) {
        await updateRelatedPlaceholders(course, storeId, classroomId);
      }
      
      // 重新加载数据
      fetchData();
    } else {
      const error = await updateResponse.json();
      showToast(`移动失败: ${error.error}`, 'error-toast');
    }
  } catch (error) {
    console.error('更新课程位置错误:', error);
    showToast('移动课程失败', 'error-toast');
  }
}

// 更新相关的占位课程
async function updateRelatedPlaceholders(course, storeId, classroomId) {
  try {
    // 如果是占位课程，更新同系列的其他占位课程
    if (course.isPlaceholder && course.parentCourseId) {
      // 获取所有课程
      const response = await fetch('/api/courses');
      const allCourses = await response.json();
      
      // 筛选出同一系列的占位课程（排除当前课程）
      const relatedPlaceholders = allCourses.filter(c => 
        c.parentCourseId === course.parentCourseId && 
        c.id !== course.id && 
        c.isPlaceholder
      );
      
      // 更新每个相关占位课程
      for (const placeholder of relatedPlaceholders) {
        const updatedPlaceholder = {
          ...placeholder,
          storeId,
          classroomId
        };
        
        await fetch(`/api/courses/${placeholder.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedPlaceholder)
        });
      }
      
      // 只有在数量大于0时才显示提示
      if (relatedPlaceholders.length > 0) {
        showToast(`已同步更新 ${relatedPlaceholders.length} 个关联课程`, 'info-toast', 3000);
      }
    }
  } catch (error) {
    console.error('更新相关占位课程错误:', error);
    // 减少用户可见的错误提示
    console.warn('无法更新相关占位课程，但主课程已成功移动');
  }
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
  
  // 清空学生列表和签到记录列表
  studentsList.innerHTML = '';
  recordsList.innerHTML = '<div class="empty-records">暂无签到记录</div>';
  
  // 更新标题
  modalTitle.textContent = course ? '编辑课程' : '添加课程';
  
  // 更新删除按钮显示状态
  deleteCourseBtn.style.display = course ? 'block' : 'none';
  
  // 确认开课按钮的显示状态
  confirmCourseBtn.style.display = 'block';
  
  // 移除已有的原始课程链接（如果有）
  const existingLink = document.querySelector('.original-course-link');
  if (existingLink) {
    existingLink.remove();
  }
  
  // 移除已有的周次信息（如果有）
  const existingWeekInfo = document.querySelector('.week-info');
  if (existingWeekInfo) {
    existingWeekInfo.remove();
  }
  
  // 处理占位课程
  if (course && course.isPlaceholder && course.parentCourseId) {
    // 占位课程不能确认开课
    confirmCourseBtn.style.display = 'none';
    
    // 添加一个查看原始课程的链接
    const dateGroup = dateSelect.closest('.form-group');
    
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
    
    // 显示周次信息
    if (course.totalWeeks && course.currentWeek) {
      const weekInfo = document.createElement('div');
      weekInfo.className = 'week-info';
      weekInfo.innerHTML = `<strong>课程进度: </strong>第${course.currentWeek}周 / 共${course.totalWeeks}周`;
      
      dateGroup.appendChild(weekInfo);
    }
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
    
    // 获取并显示课程的学生
    await fetchCourseStudents(course.id);
    await fetchCourseAttendanceRecords(course.id);
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
  
  // 如果是课程详情，创建上传二维码
  if (course) {
    createUploadQRCode(course.id);
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
  // 清空现有选项，保留第一个"全部门店"选项
  const allOption = storeFilterOptions.querySelector('.multiselect-option');
  if (allOption) {
    storeFilterOptions.innerHTML = '';
    storeFilterOptions.appendChild(allOption);
  } else {
    // 如果没有"全部门店"选项，创建一个
    storeFilterOptions.innerHTML = `
      <div class="multiselect-option">
        <label>
          <input type="checkbox" value="all" checked data-store-option>
          <span>全部门店</span>
        </label>
      </div>
    `;
  }
  
  // 添加其他门店选项
  stores.forEach(store => {
    // 对店铺名称进行压缩处理，如果太长则显示...
    let displayName = store.name;
    if (displayName.length > 15) {
      displayName = displayName.substring(0, 15) + '...';
    }
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'multiselect-option';
    
    const label = document.createElement('label');
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = store.id;
    checkbox.setAttribute('data-store-option', '');
    checkbox.checked = selectedStoreIds.includes(store.id); // 根据选中状态设置勾选
    
    const span = document.createElement('span');
    span.textContent = displayName; // 使用处理后的文本作为显示文本
    span.title = store.name; // 添加title属性，鼠标悬停时显示完整文本
    
    label.appendChild(checkbox);
    label.appendChild(span);
    optionDiv.appendChild(label);
    
    storeFilterOptions.appendChild(optionDiv);
  });
  
  // 更新显示的选中文本
  updateSelectedStoresText();
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
  
  // 添加"新建教师"选项
  const newOption = document.createElement('option');
  newOption.value = "new";
  newOption.textContent = "➕ 新建教师";
  newOption.style.fontWeight = "bold";
  newOption.style.color = "#007aff";
  teacherSelect.appendChild(newOption);
}

// 监听教师选择变化
teacherSelect.addEventListener('change', function() {
  if (this.value === 'new') {
    const teacherName = prompt('请输入新教师姓名:');
    if (teacherName && teacherName.trim()) {
      createNewTeacher(teacherName.trim());
    } else {
      // 如果用户取消或输入为空，重置选择
      this.value = '';
    }
  }
});

// 创建新教师
async function createNewTeacher(teacherName) {
  try {
    // 添加日志以便调试
    console.log('开始创建新教师:', teacherName);
    
    const response = await fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teacherName })
    });
    
    console.log('收到创建教师响应:', response.status, response.statusText);
    
    // 如果响应不成功，尝试读取错误消息
    if (!response.ok) {
      const errorText = await response.text();
      console.error('创建教师失败响应内容:', errorText);
      try {
        const error = JSON.parse(errorText);
        alert(`创建教师失败: ${error.error}`);
      } catch (e) {
        alert(`创建教师失败: ${errorText || response.statusText}`);
      }
      teacherSelect.value = '';
      return;
    }
    
    const newTeacher = await response.json();
    // 添加到教师列表
    teachers.push(newTeacher);
    // 更新下拉选项
    updateTeacherOptions();
    // 选中新创建的教师
    teacherSelect.value = newTeacher.id;
    
    console.log('成功创建新教师:', newTeacher);
  } catch (error) {
    console.error('创建教师错误:', error);
    alert('创建教师失败，请查看控制台获取详情');
    teacherSelect.value = '';
  }
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
  
  if (course.studentsList && course.studentsList.length > 0) {
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
  
  // 固定添加15行空白行（确保空白课程至少有15行）
  const emptyRowsCount = (!course.studentsList || course.studentsList.length === 0) ? 15 : 10;
  
  for (let i = 0; i < emptyRowsCount; i++) {
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

// 获取课程的签到记录
async function fetchCourseAttendanceRecords(courseId) {
  try {
    const response = await fetch(`/api/courses/${courseId}/attendance`);
    const records = await response.json();
    
    // 获取当前课程信息，确保有正确的课程名称
    let courseName = '';
    try {
      const courseResponse = await fetch(`/api/courses/${courseId}`);
      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        courseName = courseData.name || '';
      }
    } catch (courseError) {
      console.error('获取课程信息错误:', courseError);
    }
    
    // 清空记录列表
    recordsList.innerHTML = '';
    
    // 显示记录
    if (records.length === 0) {
      recordsList.innerHTML = '<div class="empty-records">暂无签到记录</div>';
    } else {
      // 创建表格布局容器
      const recordsTable = document.createElement('table');
      recordsTable.className = 'records-table';
      
      // 表头
      const tableHeader = document.createElement('thead');
      tableHeader.innerHTML = `
        <tr>
          <th width="70">预览</th>
          <th>文件信息</th>
          <th width="120">操作</th>
        </tr>
      `;
      recordsTable.appendChild(tableHeader);
      
      // 表格内容
      const tableBody = document.createElement('tbody');
      
      records.forEach(record => {
        // 格式化文件名和日期
        const fileExt = record.fileName.split('.').pop().toLowerCase();
        const iconType = fileExt === 'pdf' ? 'pdf' : 'image';
        const fileIcon = iconType === 'pdf' ? '<i class="file-icon pdf-icon">📄</i>' : 
                           iconType === 'image' ? '<i class="file-icon image-icon">📷</i>' : 
                           '<i class="file-icon">📎</i>';
        
        // 格式化上传日期
        const uploadDate = new Date(record.uploadDate);
        const formattedDate = uploadDate.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // 处理长文件名
        const courseDate = new Date(record.recordDate);
        const courseDateStr = formatDate(courseDate);

        // 使用课程名和日期显示，保持界面简洁不显示时间戳
        const displayCourseName = record.courseName || courseName || '课程';
        const displayFileName = `${displayCourseName} (${courseDateStr})`;
        
        // 创建表格行
        const row = document.createElement('tr');
        row.className = 'record-row';
        
        // 预览列
        const previewCell = document.createElement('td');
        previewCell.className = 'preview-cell';
        
        const thumbnail = document.createElement('img');
        thumbnail.className = 'record-thumbnail';
        
        if (record.mimeType.startsWith('image/')) {
          // 使用完整文件路径，不再需要添加额外的时间戳，因为文件名已经唯一
          thumbnail.src = record.filePath;
          thumbnail.setAttribute('data-fullsize', record.filePath);
          thumbnail.onclick = () => window.open(record.filePath, '_blank');
        } else {
          thumbnail.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24"><path fill="%23999" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>';
        }
        
        previewCell.appendChild(thumbnail);
        
        // 信息列
        const infoCell = document.createElement('td');
        infoCell.className = 'info-cell';
        
        // 构建文件信息HTML，包含原始文件名作为title提示
        let titleText = record.fileName;
        // 如果有原始文件名，显示在提示中
        if (record.originalFileName && record.originalFileName !== record.fileName) {
          titleText += `\n原始文件名: ${record.originalFileName}`;
        }
        
        infoCell.innerHTML = `
          <div class="record-name" title="${titleText}">${fileIcon} ${displayFileName}</div>
          <div class="record-date">上传于 ${formattedDate}</div>
          <div class="record-size">${formatFileSize(record.fileSize)}</div>
        `;
        
        // 操作列
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'action-btn view-btn';
        viewBtn.innerHTML = '<span class="btn-icon">👁️</span> 查看';
        viewBtn.addEventListener('click', () => {
          window.open(record.filePath, '_blank');
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.innerHTML = '<span class="btn-icon">🗑️</span> 删除';
        deleteBtn.addEventListener('click', async () => {
          await deleteAttendanceRecord(courseId, record.id);
        });
        
        actionsCell.appendChild(viewBtn);
        
        // 如果是图片，添加复制按钮
        if (record.mimeType.startsWith('image/')) {
          const copyBtn = document.createElement('button');
          copyBtn.className = 'action-btn copy-btn';
          copyBtn.innerHTML = '<span class="btn-icon">📋</span> 复制';
          copyBtn.addEventListener('click', () => {
            copyImageToClipboard(record.filePath);
          });
          actionsCell.appendChild(copyBtn);
        }
        
        actionsCell.appendChild(deleteBtn);
        
        // 添加所有单元格到行
        row.appendChild(previewCell);
        row.appendChild(infoCell);
        row.appendChild(actionsCell);
        
        // 添加行到表格
        tableBody.appendChild(row);
      });
      
      recordsTable.appendChild(tableBody);
      recordsList.appendChild(recordsTable);
    }
  } catch (error) {
    console.error('获取签到记录错误:', error);
    recordsList.innerHTML = '<div class="error-message">获取签到记录失败</div>';
  }
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

// 复制图片到剪贴板
async function copyImageToClipboard(imageSrc) {
  // 显示加载中的提示
  showToast('正在准备复制图片...', 'loading-toast');
  
  try {
    // 创建一个临时canvas元素
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 加载图片并返回一个Promise
    const loadImage = () => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // 尝试处理跨域问题
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = imageSrc;
        
        // 如果图片已经在缓存中直接加载完成，onload可能不会触发
        if (img.complete) {
          resolve(img);
        }
      });
    };
    
    // 等待图片加载
    const img = await loadImage();
    
    // 设置canvas尺寸为图片尺寸
    canvas.width = img.width;
    canvas.height = img.height;
    
    // 在canvas上绘制图片
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    // 方法1: 使用canvas.toBlob和ClipboardItem API (现代浏览器)
    try {
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      showToast('图片已复制到剪贴板', 'success-toast');
      return; // 成功退出函数
    } catch (clipboardError) {
      console.warn('方法1复制图片失败:', clipboardError);
      // 继续尝试方法2
    }
    
    // 方法2: 创建一个临时DOM元素并尝试复制
    try {
      // 创建一个临时的图片显示区域
      const tempImgContainer = document.createElement('div');
      tempImgContainer.style.position = 'fixed';
      tempImgContainer.style.left = '0';
      tempImgContainer.style.top = '0';
      tempImgContainer.style.opacity = '0';
      tempImgContainer.style.pointerEvents = 'none';
      tempImgContainer.style.zIndex = '-1';
      
      const tempImg = document.createElement('img');
      tempImg.src = canvas.toDataURL('image/png');
      tempImgContainer.appendChild(tempImg);
      document.body.appendChild(tempImgContainer);
      
      // 创建一个range并选择图片
      const range = document.createRange();
      range.selectNode(tempImg);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      
      // 尝试复制
      const success = document.execCommand('copy');
      
      // 清理临时元素
      window.getSelection().removeAllRanges();
      document.body.removeChild(tempImgContainer);
      
      if (success) {
        showToast('图片已复制到剪贴板', 'success-toast');
        return; // 成功退出函数
      }
    } catch (execCommandError) {
      console.warn('方法2复制图片失败:', execCommandError);
      // 继续尝试方法3
    }
    
    // 方法3: 如果上述方法都失败，提供在新窗口中打开图片的选项
    showToast('无法直接复制图片，正在打开图片...', 'info-toast');
    setTimeout(() => {
      window.open(imageSrc, '_blank');
      showToast('请在新窗口中右键选择"复制图片"', 'info-toast');
    }, 1500);
    
  } catch (error) {
    console.error('复制图片失败:', error);
    showToast('复制图片失败: ' + error.message, 'error-toast');
  }
}

// 删除签到记录
async function deleteAttendanceRecord(courseId, recordId) {
  try {
    const response = await fetch(`/api/courses/${courseId}/attendance/${recordId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      fetchCourseAttendanceRecords(courseId);
    } else {
      const error = await response.json();
      alert(`删除签到记录失败: ${error.error}`);
    }
  } catch (error) {
    console.error('删除签到记录错误:', error);
    alert('删除签到记录失败，请查看控制台获取详情');
  }
}

// 初始化上传处理函数
function initUploadHandlers() {
  // 文件拖放处理
  uploadDropzone.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
    uploadDropzone.classList.add('active');
  });
  
  uploadDropzone.addEventListener('dragleave', e => {
    e.preventDefault();
    e.stopPropagation();
    uploadDropzone.classList.remove('active');
  });
  
  uploadDropzone.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    uploadDropzone.classList.remove('active');
    
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });
  
  // 点击上传区域触发文件选择
  uploadDropzone.addEventListener('click', () => {
    fileUploadInput.click();
  });
  
  // 文件选择处理
  fileUploadInput.addEventListener('change', e => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });
  
  // 粘贴处理
  pasteArea.addEventListener('click', () => {
    pasteArea.classList.add('active');
    alert('请使用键盘快捷键Ctrl+V（Windows）或Command+V（Mac）粘贴图片');
    
    // 聚焦以捕获粘贴事件
    pasteArea.setAttribute('tabindex', '0');
    pasteArea.focus();
  });
  
  pasteArea.addEventListener('blur', () => {
    pasteArea.classList.remove('active');
  });
  
  pasteArea.addEventListener('paste', e => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        handleFileSelect(file);
        break;
      }
    }
    
    pasteArea.classList.remove('active');
    pasteArea.blur();
  });
  
  // 监听全局粘贴事件
  document.addEventListener('paste', e => {
    if (courseModal.style.display === 'block' && currentCourse) {
      const items = e.clipboardData.items;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          handleFileSelect(file);
          break;
        }
      }
    }
  });
  
  // 确认/取消上传
  confirmUploadBtn.addEventListener('click', () => {
    if (currentUploadFile && currentCourse) {
      uploadAttendanceFile(currentCourse.id, currentUploadFile);
    }
  });
  
  cancelUploadBtn.addEventListener('click', () => {
    clearFilePreview();
  });
}

// 处理文件选择
function handleFileSelect(file) {
  if (!file) return;
  
  // 检查文件类型
  const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!validTypes.includes(file.type)) {
    alert('不支持的文件类型，仅支持JPG、PNG和PDF文件');
    return;
  }
  
  // 检查文件大小 (10MB限制)
  if (file.size > 10 * 1024 * 1024) {
    alert('文件太大，请选择小于10MB的文件');
    return;
  }
  
  // 保存文件并显示预览
  currentUploadFile = file;
  showFilePreview(file);
}

// 显示文件预览
function showFilePreview(file) {
  uploadPreviewContainer.style.display = 'block';
  uploadPreview.innerHTML = '';
  
  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.onload = () => URL.revokeObjectURL(img.src); // 清理内存
    img.src = URL.createObjectURL(file);
    uploadPreview.appendChild(img);
  } else if (file.type === 'application/pdf') {
    const embed = document.createElement('embed');
    embed.type = 'application/pdf';
    embed.src = URL.createObjectURL(file);
    uploadPreview.appendChild(embed);
  }
}

// 清除文件预览
function clearFilePreview() {
  uploadPreviewContainer.style.display = 'none';
  uploadPreview.innerHTML = '';
  currentUploadFile = null;
}

// 上传签到表文件
async function uploadAttendanceFile(courseId, file) {
  if (!file || !courseId) return;
  
  try {
    // 创建表单数据
    const formData = new FormData();
    formData.append('file', file);
    
    // 禁用按钮
    confirmUploadBtn.disabled = true;
    confirmUploadBtn.textContent = '上传中...';
    
    const response = await fetch(`/api/courses/${courseId}/attendance`, {
      method: 'POST',
      body: formData
    });
    
    // 恢复按钮状态
    confirmUploadBtn.disabled = false;
    confirmUploadBtn.textContent = '确认上传';
    
    if (response.ok) {
      // 清除预览
      clearFilePreview();
      
      // 重新获取签到记录
      fetchCourseAttendanceRecords(courseId);
    } else {
      let errorMsg = '上传失败';
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } catch (e) {}
      
      alert(`上传签到表失败: ${errorMsg}`);
    }
  } catch (error) {
    console.error('上传签到表错误:', error);
    alert('上传签到表失败，请查看控制台获取详情');
    
    confirmUploadBtn.disabled = false;
    confirmUploadBtn.textContent = '确认上传';
  }
}

// 创建上传二维码
function createUploadQRCode(courseId) {
  const qrcodeElement = document.getElementById('upload-qrcode');
  qrcodeElement.innerHTML = '';
  
  // 使用公网IP地址替代localhost
  const uploadUrl = `http://121.196.200.253:3000/mobile-upload.html?courseId=${courseId}`;
  
  new QRCode(qrcodeElement, {
    text: uploadUrl,
    width: 120,
    height: 120
  });
}

// 显示Toast通知
function showToast(message, className, duration = 3000) {
  // 移除现有的提示
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => {
    document.body.removeChild(toast);
  });
  
  // 创建新提示
  const toast = document.createElement('div');
  toast.className = `toast ${className || ''}`;
  toast.textContent = message;
  
  // 如果是拖拽相关的提示，增加持续时间
  if (message.includes('课程已移至')) {
    duration = 5000;  // 延长拖拽操作后的提示显示时间
  }
  
  document.body.appendChild(toast);
  
  // 自动消失
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.opacity = 0;
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 500);
    }
  }, duration);
  
  return toast;
} 