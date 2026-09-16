/**
 * 演示数据生成脚本
 *   pnpm db:seed        （已有数据的库不会重复写入，先 db:reset 可重建）
 * 使用固定随机种子，每次生成的数据完全一致，方便演示与截图对照。
 */
import { all, db, scalar, transaction } from './index';
import { hashPassword } from '../utils/password';

// ---------------------------------------------------------------- 随机工具
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20250915);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)];
const sample = <T>(arr: T[], count: number): T[] => {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < count && copy.length; i += 1) {
    result.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return result;
};
/** 正态分布（Box-Muller），用于生成成绩 */
function normal(mean: number, sd: number) {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------------------------------------------------------------- 姓名素材
const SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林',
  '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧', '程', '曹',
  '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕', '苏', '卢', '蒋', '蔡', '贾', '丁', '魏', '薛',
];
const MALE_NAMES = [
  '浩然', '子轩', '宇航', '嘉豪', '俊杰', '博文', '天佑', '思远', '文轩', '亦辰', '昊然', '子墨',
  '明轩', '晨曦', '睿泽', '建国', '志强', '伟东', '振宇', '鹏飞',
];
const FEMALE_NAMES = [
  '欣怡', '雨涵', '梓萱', '思彤', '梦琪', '语嫣', '静雯', '诗涵', '晓彤', '佳怡', '若曦', '雅琴',
  '慧敏', '雪莹', '可欣', '婷婷', '嘉怡', '瑾萱', '月柔', '紫涵',
];
const ETHNICITY = ['汉族', '汉族', '汉族', '汉族', '汉族', '回族', '满族', '壮族', '苗族', '维吾尔族'];
const POLITICAL = ['共青团员', '共青团员', '共青团员', '中共党员', '群众', '中共预备党员'];
const NATIVE_CITIES = [
  '北京市', '上海市', '广州市', '深圳市', '杭州市', '南京市', '成都市', '武汉市', '西安市', '重庆市',
  '长沙市', '苏州市', '青岛市', '郑州市', '天津市', '沈阳市', '济南市', '合肥市', '福州市', '昆明市',
];
const AREA_CODES = ['110101', '310104', '440305', '330106', '510107', '420111', '320105', '610113'];
const BUILDINGS = ['紫荆公寓', '丁香公寓', '桃李公寓', '研究生公寓'];

function randomName(gender: '男' | '女') {
  const given = gender === '男' ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
  return `${pick(SURNAMES)}${given}`;
}

function pad(value: number, length: number) {
  return String(value).padStart(length, '0');
}

/** 生成合法的 18 位身份证号（校验位按 GB 11643 计算） */
function makeIdCard(birthDate: string) {
  const base = `${pick(AREA_CODES)}${birthDate.replace(/-/g, '')}${pad(randInt(1, 999), 3)}`;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const sum = base
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
  return `${base}${codes[sum % 11]}`;
}

function makePhone() {
  return `${pick(['138', '139', '155', '158', '176', '186', '199'])}${pad(randInt(0, 99999999), 8)}`;
}

function makeBirthDate(enrollYear: number) {
  const year = enrollYear - randInt(17, 20);
  const month = randInt(1, 12);
  const day = randInt(1, 28);
  return `${year}-${pad(month, 2)}-${pad(day, 2)}`;
}

function makeDate(year: number, monthStart = 1, monthEnd = 12) {
  return `${year}-${pad(randInt(monthStart, monthEnd), 2)}-${pad(randInt(1, 28), 2)}`;
}

// ---------------------------------------------------------------- 基础数据
const DEPARTMENTS = [
  { code: '01', name: '计算机科学与技术学院', dean: '张启明', office: '信息楼 A 座 3 层', phone: '010-62785001',
    description: '下设计算机、软件工程、人工智能等专业，承担全校程序设计类公共课教学。' },
  { code: '02', name: '电子信息工程学院', dean: '李承泽', office: '电子楼 2 层', phone: '010-62785002',
    description: '聚焦电路与系统、通信、自动控制方向，拥有电子实验教学中心。' },
  { code: '03', name: '经济管理学院', dean: '王慧敏', office: '经管楼 5 层', phone: '010-62785003',
    description: '涵盖工商管理、会计学、国际经济与贸易等专业，开设 MBA 教育项目。' },
  { code: '04', name: '外国语学院', dean: '陈静雯', office: '文科楼 4 层', phone: '010-62785004',
    description: '承担英语、日语、翻译专业教学及全校大学外语公共课。' },
  { code: '05', name: '机械与能源工程学院', dean: '刘国栋', office: '工程训练中心 2 层', phone: '010-62785005',
    description: '面向智能制造与新能源装备，设有工程训练国家级实验教学示范中心。' },
  { code: '06', name: '数学与统计学院', dean: '赵一鸣', office: '理科楼 6 层', phone: '010-62785006',
    description: '承担数学与应用数学、统计学专业及全校高等数学公共课教学。' },
];

const MAJORS = [
  { code: '080901', name: '计算机科学与技术', dept: '01', degree: '本科', years: 4 },
  { code: '080902', name: '软件工程', dept: '01', degree: '本科', years: 4 },
  { code: '080717', name: '人工智能', dept: '01', degree: '本科', years: 4 },
  { code: '080910', name: '数据科学与大数据技术', dept: '01', degree: '本科', years: 4 },
  { code: '080701', name: '电子信息工程', dept: '02', degree: '本科', years: 4 },
  { code: '080703', name: '通信工程', dept: '02', degree: '本科', years: 4 },
  { code: '080801', name: '自动化', dept: '02', degree: '本科', years: 4 },
  { code: '120201', name: '工商管理', dept: '03', degree: '本科', years: 4 },
  { code: '120203', name: '会计学', dept: '03', degree: '本科', years: 4 },
  { code: '020401', name: '国际经济与贸易', dept: '03', degree: '本科', years: 4 },
  { code: '050201', name: '英语', dept: '04', degree: '本科', years: 4 },
  { code: '050207', name: '日语', dept: '04', degree: '本科', years: 4 },
  { code: '050261', name: '翻译', dept: '04', degree: '本科', years: 4 },
  { code: '080202', name: '机械设计制造及其自动化', dept: '05', degree: '本科', years: 4 },
  { code: '080501', name: '能源与动力工程', dept: '05', degree: '本科', years: 4 },
  { code: '080207', name: '车辆工程', dept: '05', degree: '本科', years: 4 },
  { code: '070101', name: '数学与应用数学', dept: '06', degree: '本科', years: 4 },
  { code: '071201', name: '统计学', dept: '06', degree: '本科', years: 4 },
  { code: '070102', name: '信息与计算科学', dept: '06', degree: '本科', years: 4 },
];

const COURSES = [
  // 计算机
  { code: 'CS101', name: '高级语言程序设计', credit: 4, hours: 64, type: '必修', dept: '01' },
  { code: 'CS201', name: '数据结构与算法', credit: 4, hours: 64, type: '必修', dept: '01' },
  { code: 'CS202', name: '计算机组成原理', credit: 3.5, hours: 56, type: '必修', dept: '01' },
  { code: 'CS301', name: '操作系统', credit: 3.5, hours: 56, type: '必修', dept: '01' },
  { code: 'CS302', name: '计算机网络', credit: 3, hours: 48, type: '必修', dept: '01' },
  { code: 'CS303', name: '数据库系统原理', credit: 3, hours: 48, type: '必修', dept: '01' },
  { code: 'CS401', name: '机器学习导论', credit: 3, hours: 48, type: '选修', dept: '01' },
  { code: 'CS402', name: '软件工程导论', credit: 3, hours: 48, type: '必修', dept: '01' },
  // 电子
  { code: 'EE101', name: '电路分析基础', credit: 4, hours: 64, type: '必修', dept: '02' },
  { code: 'EE201', name: '模拟电子技术', credit: 3.5, hours: 56, type: '必修', dept: '02' },
  { code: 'EE202', name: '数字电子技术', credit: 3, hours: 48, type: '必修', dept: '02' },
  { code: 'EE301', name: '信号与系统', credit: 3.5, hours: 56, type: '必修', dept: '02' },
  { code: 'EE302', name: '通信原理', credit: 3.5, hours: 56, type: '必修', dept: '02' },
  { code: 'EE401', name: '嵌入式系统设计', credit: 3, hours: 48, type: '选修', dept: '02' },
  // 经管
  { code: 'EM101', name: '管理学原理', credit: 3, hours: 48, type: '必修', dept: '03' },
  { code: 'EM102', name: '微观经济学', credit: 3, hours: 48, type: '必修', dept: '03' },
  { code: 'EM201', name: '财务会计学', credit: 3.5, hours: 56, type: '必修', dept: '03' },
  { code: 'EM301', name: '市场营销学', credit: 3, hours: 48, type: '选修', dept: '03' },
  { code: 'EM302', name: '国际贸易实务', credit: 2.5, hours: 40, type: '选修', dept: '03' },
  // 外语
  { code: 'FL101', name: '综合英语', credit: 4, hours: 64, type: '必修', dept: '04' },
  { code: 'FL102', name: '英语听说', credit: 2, hours: 32, type: '必修', dept: '04' },
  { code: 'FL201', name: '英汉翻译理论与实践', credit: 3, hours: 48, type: '必修', dept: '04' },
  { code: 'FL301', name: '日本概况', credit: 2, hours: 32, type: '选修', dept: '04' },
  { code: 'FL302', name: '商务英语写作', credit: 2.5, hours: 40, type: '选修', dept: '04' },
  // 机械
  { code: 'ME101', name: '理论力学', credit: 3.5, hours: 56, type: '必修', dept: '05' },
  { code: 'ME201', name: '机械设计基础', credit: 4, hours: 64, type: '必修', dept: '05' },
  { code: 'ME202', name: '工程热力学', credit: 3, hours: 48, type: '必修', dept: '05' },
  { code: 'ME301', name: '汽车构造', credit: 3, hours: 48, type: '必修', dept: '05' },
  { code: 'ME401', name: '智能制造技术', credit: 2.5, hours: 40, type: '选修', dept: '05' },
  // 数学
  { code: 'MA101', name: '数学分析', credit: 5, hours: 80, type: '必修', dept: '06' },
  { code: 'MA102', name: '高等代数', credit: 4, hours: 64, type: '必修', dept: '06' },
  { code: 'MA201', name: '概率论与数理统计', credit: 3.5, hours: 56, type: '必修', dept: '06' },
  { code: 'MA301', name: '数值分析', credit: 3, hours: 48, type: '必修', dept: '06' },
  { code: 'MA401', name: '应用随机过程', credit: 3, hours: 48, type: '选修', dept: '06' },
  // 公共课
  { code: 'GE101', name: '大学英语（一）', credit: 3, hours: 48, type: '通识', dept: null },
  { code: 'GE102', name: '高等数学 A', credit: 5, hours: 80, type: '通识', dept: null },
  { code: 'GE103', name: '线性代数', credit: 2.5, hours: 40, type: '通识', dept: null },
  { code: 'GE104', name: '大学物理', credit: 4, hours: 64, type: '通识', dept: null },
  { code: 'GE105', name: '思想道德与法治', credit: 3, hours: 48, type: '通识', dept: null },
  { code: 'GE106', name: '体育与健康', credit: 1, hours: 32, type: '通识', dept: null },
  { code: 'GE107', name: '计算机应用基础', credit: 2, hours: 32, type: '通识', dept: null },
  { code: 'GE108', name: '大学生职业生涯规划', credit: 1, hours: 16, type: '通识', dept: null },
  { code: 'GE109', name: '创新创业基础', credit: 2, hours: 32, type: '通识', dept: null },
];

const TITLES: { title: string; weight: number }[] = [
  { title: '教授', weight: 8 },
  { title: '副教授', weight: 14 },
  { title: '讲师', weight: 18 },
  { title: '助教', weight: 5 },
  { title: '研究员', weight: 3 },
];

const SEMESTERS = ['2023-2024-2', '2024-2025-1', '2024-2025-2', '2025-2026-1'];
const CURRENT_SEMESTER = '2025-2026-1';
const ENROLL_YEARS = [2021, 2022, 2023, 2024, 2025];

// ---------------------------------------------------------------- 主流程
export function seed() {
  const existing = scalar<number>(`SELECT COUNT(*) FROM department`);
  if (existing > 0) {
    console.log('[seed] 数据库中已有数据，跳过初始化（如需重建请执行 pnpm db:reset）');
    return;
  }

  // 所有演示账号统一使用同一个密码哈希，避免逐条 bcrypt 带来的耗时
  const defaultHash = hashPassword('123456');
  const startedAt = Date.now();

  transaction(() => {
    // ---------------- 院系
    const deptIds = new Map<string, number>();
    DEPARTMENTS.forEach((dept, index) => {
      const info = db
        .prepare(
          `INSERT INTO department (code, name, dean, phone, office, description, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(dept.code, dept.name, dept.dean, dept.phone, dept.office, dept.description, index + 1);
      deptIds.set(dept.code, Number(info.lastInsertRowid));
    });

    // ---------------- 专业
    const majorIds = new Map<string, number>();
    const majorList: { id: number; code: string; name: string; dept: string; year: number }[] = [];
    MAJORS.forEach((major) => {
      const departmentId = deptIds.get(major.dept)!;
      const info = db
        .prepare(
          `INSERT INTO major (code, name, department_id, degree_type, duration_years, description)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          major.code,
          major.name,
          departmentId,
          major.degree,
          major.years,
          `${major.name}专业，学制 ${major.years} 年，授予${major.degree === '本科' ? '学士' : '硕士'}学位。`,
        );
      majorIds.set(major.code, Number(info.lastInsertRowid));
      majorList.push({ id: Number(info.lastInsertRowid), code: major.code, name: major.name, dept: major.dept, year: major.years });
    });

    // ---------------- 教师
    const teacherStmt = db.prepare(
      `INSERT INTO teacher (teacher_no, name, gender, title, department_id, phone, email, hire_date, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const teacherIds: { id: number; name: string; dept: string; title: string }[] = [];
    const deptCodes = DEPARTMENTS.map((d) => d.code);
    let teacherSeq = 1;

    for (const spec of TITLES) {
      for (let i = 0; i < spec.weight; i += 1) {
        const deptCode = pick(deptCodes);
        const gender: '男' | '女' = rand() > 0.42 ? '男' : '女';
        const name = randomName(gender);
        const teacherNo = `T${pad(teacherSeq, 4)}`;
        const hiredYear = 2024 - randInt(0, 22);
        const info = teacherStmt.run(
          teacherNo,
          name,
          gender,
          spec.title,
          deptIds.get(deptCode)!,
          makePhone(),
          `${teacherNo.toLowerCase()}@university.edu.cn`,
          makeDate(hiredYear),
          rand() > 0.06 ? '在职' : rand() > 0.5 ? '休假' : '离职',
          null,
        );
        teacherIds.push({ id: Number(info.lastInsertRowid), name, dept: deptCode, title: spec.title });
        teacherSeq += 1;
      }
    }

    // 教研团队账号（密码同为 123456），并保留一位内置管理员
    db.prepare(
      `INSERT INTO sys_user (username, password, real_name, role, ref_id, phone, email, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('admin', hashPassword('admin123'), '系统管理员', 'admin', null, '010-62785000', 'admin@university.edu.cn', '启用');

    const userStmt = db.prepare(
      `INSERT INTO sys_user (username, password, real_name, role, ref_id, phone, email, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const teacher of teacherIds) {
      const row = all<{ teacher_no: string; phone: string; email: string; status: string }>(
        `SELECT teacher_no, phone, email, status FROM teacher WHERE id = ?`,
        [teacher.id],
      )[0];
      userStmt.run(
        row.teacher_no,
        defaultHash,
        teacher.name,
        'teacher',
        teacher.id,
        row.phone,
        row.email,
        row.status === '离职' ? '停用' : '启用',
      );
    }

    // ---------------- 班级
    const classStmt = db.prepare(
      `INSERT INTO class_group (code, name, major_id, grade_year, counselor_id, classroom, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const classList: { id: number; name: string; majorId: number; dept: string; year: number }[] = [];
    for (const major of majorList) {
      const deptTeachers = teacherIds.filter((t) => t.dept === major.dept);
      for (const year of ENROLL_YEARS) {
        const counselor = deptTeachers.length ? pick(deptTeachers) : null;
        const className = `${major.name}${year}级1班`;
        const code = `${major.code}-${year}-1`;
        const info = classStmt.run(
          code,
          className,
          major.id,
          year,
          counselor?.id ?? null,
          `${pick(['信息楼', '电子楼', '经管楼', '文科楼', '工程楼', '理科楼'])}${randInt(1, 5)}0${randInt(1, 8)}`,
          year === 2021 ? '已毕业' : '在读',
        );
        classList.push({ id: Number(info.lastInsertRowid), name: className, majorId: major.id, dept: major.dept, year });
      }
    }

    // ---------------- 学生
    const studentStmt = db.prepare(
      `INSERT INTO student (student_no, name, gender, birth_date, id_card, phone, email, class_id,
                            enroll_year, status, political_status, ethnicity, native_place, address,
                            guardian_name, guardian_phone, dormitory, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const studentIds: { id: number; dept: string; classId: number; year: number; gender: string }[] = [];
    /** 学号序号按「年级 + 专业」独立计数，保证不会重复 */
    const studentNoSeq = new Map<string, number>();

    for (const cls of classList) {
      const size = randInt(9, 13);
      for (let i = 0; i < size; i += 1) {
        const gender: '男' | '女' = rand() > 0.48 ? '男' : '女';
        const name = randomName(gender);
        const birthDate = makeBirthDate(cls.year);
        const majorCode = majorList.find((m) => m.id === cls.majorId)!.code;
        const seqKey = `${cls.year}-${majorCode}`;
        const nextSeq = (studentNoSeq.get(seqKey) ?? 0) + 1;
        studentNoSeq.set(seqKey, nextSeq);
        const finalNo = `${cls.year}${majorCode}${pad(nextSeq, 3)}`;

        let status = '在读';
        if (cls.year === 2021) {
          status = rand() > 0.12 ? '毕业' : rand() > 0.5 ? '退学' : '休学';
        } else if (rand() < 0.03) {
          status = rand() > 0.5 ? '休学' : '退学';
        }

        const nativePlace = pick(NATIVE_CITIES);
        const info = studentStmt.run(
          finalNo,
          name,
          gender,
          birthDate,
          makeIdCard(birthDate),
          makePhone(),
          `${finalNo}@stu.university.edu.cn`,
          cls.id,
          cls.year,
          status,
          pick(POLITICAL),
          pick(ETHNICITY),
          nativePlace,
          `${nativePlace}${pick(['朝阳区', '海淀区', '西湖区', '天河区', '锦江区', '雨花区'])}${pick(['幸福', '和平', '长江', '文化', '建设'])}路${randInt(1, 200)}号`,
          `${pick(SURNAMES)}${pick(['建国', '秀英', '桂芳', '志强', '海燕', '文军'])}`,
          makePhone(),
          `${pick(BUILDINGS)}${randInt(1, 12)}号楼-${randInt(1, 6)}0${randInt(1, 9)}`,
          null,
        );
        studentIds.push({ id: Number(info.lastInsertRowid), dept: cls.dept, classId: cls.id, year: cls.year, gender });
      }
    }

    // 学生登录账号
    const studentUsers = all<{ id: number; student_no: string; name: string; phone: string; email: string; status: string }>(
      `SELECT id, student_no, name, phone, email, status FROM student`,
    );
    for (const student of studentUsers) {
      userStmt.run(
        student.student_no,
        defaultHash,
        student.name,
        'student',
        student.id,
        student.phone,
        student.email,
        student.status === '在读' || student.status === '休学' ? '启用' : '停用',
      );
    }

    // ---------------- 课程
    const courseStmt = db.prepare(
      `INSERT INTO course (course_code, name, credit, hours, course_type, department_id, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const courseList: { id: number; code: string; name: string; credit: number; type: string; dept: string | null }[] = [];
    for (const course of COURSES) {
      const info = courseStmt.run(
        course.code,
        course.name,
        course.credit,
        course.hours,
        course.type,
        course.dept ? deptIds.get(course.dept)! : null,
        `${course.name}（${course.credit} 学分 / ${course.hours} 学时），课程类型：${course.type}。`,
      );
      courseList.push({
        id: Number(info.lastInsertRowid),
        code: course.code,
        name: course.name,
        credit: course.credit,
        type: course.type,
        dept: course.dept,
      });
    }

    // ---------------- 开课（教学班）
    const offeringStmt = db.prepare(
      `INSERT INTO course_offering (offering_code, course_id, teacher_id, semester, class_id, classroom,
                                    schedule, capacity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const enrollmentStmt = db.prepare(
      `INSERT INTO enrollment (offering_id, student_id, select_status, score, exam_type, remark)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    const classrooms = ['A101', 'A203', 'B305', 'B412', 'C201', 'C508', 'D102', 'D306', '实验楼 E201', '实验楼 E305'];
    const schedules = [
      '周一 1-2 节', '周一 3-4 节', '周二 1-2 节', '周二 5-6 节', '周三 3-4 节',
      '周三 7-8 节', '周四 1-2 节', '周四 5-6 节', '周五 3-4 节', '周五 7-8 节',
    ];

    let offeringSeq = 0;
    const studentByClass = new Map<number, number[]>();
    for (const student of studentIds) {
      const list = studentByClass.get(student.classId) ?? [];
      list.push(student.id);
      studentByClass.set(student.classId, list);
    }
    const activeStudentIds = all<{ id: number; class_id: number }>(
      `SELECT id, class_id FROM student WHERE status IN ('在读','休学')`,
    );

    for (const semester of SEMESTERS) {
      const isCurrent = semester === CURRENT_SEMESTER;

      // 1) 专业必修课：面向具体行政班开课
      for (const cls of classList) {
        if (cls.year === 2021) continue; // 已毕业年级不再开课
        if (rand() > 0.55) continue;
        const deptCourses = courseList.filter((c) => c.dept === cls.dept);
        if (!deptCourses.length) continue;
        const course = pick(deptCourses);
        const deptTeachers = teacherIds.filter((t) => t.dept === cls.dept);
        const teacher = deptTeachers.length ? pick(deptTeachers) : null;

        offeringSeq += 1;
        const offeringCode = `${semester.replace(/-/g, '')}-${pad(offeringSeq, 4)}`;
        const info = offeringStmt.run(
          offeringCode,
          course.id,
          teacher?.id ?? null,
          semester,
          cls.id,
          pick(classrooms),
          pick(schedules),
          randInt(40, 60),
          isCurrent ? '开放选课' : '已结束',
        );
        const offeringId = Number(info.lastInsertRowid);

        const classStudents = studentByClass.get(cls.id) ?? [];
        for (const studentId of classStudents) {
          const hasScore = !isCurrent && rand() < 0.92;
          const score = hasScore ? Math.min(100, Math.max(35, Math.round(normal(79, 9)))) : null;
          enrollmentStmt.run(
            offeringId,
            studentId,
            '已选',
            score,
            score !== null && score < 60 ? (rand() > 0.5 ? '补考' : '重修') : '正常考试',
            null,
          );
        }
      }

      // 2) 通识 / 选修课：面向全校开放选课
      const openCourses = courseList.filter((c) => c.type === '通识' || c.type === '选修');
      for (const course of sample(openCourses, 12)) {
        const deptTeachers = course.dept ? teacherIds.filter((t) => t.dept === course.dept) : teacherIds;
        const teacher = deptTeachers.length ? pick(deptTeachers) : null;
        // 当前学期选课人数更多，保证每位在读学生都能查到本学期课程
        const capacity = isCurrent ? randInt(180, 280) : randInt(60, 120);

        offeringSeq += 1;
        const offeringCode = `${semester.replace(/-/g, '')}-${pad(offeringSeq, 4)}`;
        const info = offeringStmt.run(
          offeringCode,
          course.id,
          teacher?.id ?? null,
          semester,
          null,
          pick(classrooms),
          pick(schedules),
          capacity,
          isCurrent ? '开放选课' : '已结束',
        );
        const offeringId = Number(info.lastInsertRowid);

        const enrollCount = isCurrent
          ? randInt(140, Math.min(capacity, 220))
          : randInt(30, Math.min(capacity, 70));
        const enrolled = sample(activeStudentIds, enrollCount);
        for (const student of enrolled) {
          const hasScore = !isCurrent && rand() < 0.88;
          const score = hasScore ? Math.min(100, Math.max(40, Math.round(normal(81, 8)))) : null;
          enrollmentStmt.run(
            offeringId,
            student.id,
            '已选',
            score,
            score !== null && score < 60 ? '补考' : '正常考试',
            null,
          );
        }
      }
    }

    // ---------------- 系统参数
    const settingStmt = db.prepare(`INSERT INTO sys_setting (key, value, label) VALUES (?, ?, ?)`);
    settingStmt.run('academic_year', '2025-2026', '当前学年');
    settingStmt.run('current_semester', CURRENT_SEMESTER, '当前学期');
    settingStmt.run('pass_score', '60', '及格分数线');
    settingStmt.run('max_credit_per_term', '30', '每学期最高选课学分');

    // ---------------- 操作日志样例
    const logStmt = db.prepare(
      `INSERT INTO sys_log (user_id, username, module, action, method, path, ip, detail, success, cost_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const admin = all<{ id: number }>(`SELECT id FROM sys_user WHERE username = 'admin'`)[0];
    const logSamples: [string, string, string, string][] = [
      ['学生管理', '新增', 'POST', '/api/students'],
      ['学生管理', '修改', 'PUT', '/api/students/12'],
      ['教师管理', '新增', 'POST', '/api/teachers'],
      ['课程管理', '修改', 'PUT', '/api/courses/8'],
      ['开课管理', '新增', 'POST', '/api/offerings'],
      ['选课成绩', '录入成绩', 'POST', '/api/enrollments/batch-score'],
      ['院系管理', '修改', 'PUT', '/api/departments/2'],
      ['用户管理', '重置密码', 'POST', '/api/users/6/reset-password'],
      ['专业管理', '新增', 'POST', '/api/majors'],
      ['班级管理', '修改', 'PUT', '/api/classes/31'],
    ];
    for (let i = 0; i < 36; i += 1) {
      const [module, action, method, path] = logSamples[i % logSamples.length];
      const day = 14 - Math.floor(i / 3);
      logStmt.run(
        admin?.id ?? null,
        'admin',
        module,
        action,
        method,
        path,
        `10.12.${randInt(1, 20)}.${randInt(2, 250)}`,
        `${action}操作成功`,
        1,
        randInt(12, 260),
        `2025-09-${pad(Math.max(1, day), 2)} ${pad(randInt(8, 20), 2)}:${pad(randInt(0, 59), 2)}:${pad(randInt(0, 59), 2)}`,
      );
    }
  });

  const summary = {
    departments: scalar<number>(`SELECT COUNT(*) FROM department`),
    majors: scalar<number>(`SELECT COUNT(*) FROM major`),
    classes: scalar<number>(`SELECT COUNT(*) FROM class_group`),
    teachers: scalar<number>(`SELECT COUNT(*) FROM teacher`),
    students: scalar<number>(`SELECT COUNT(*) FROM student`),
    courses: scalar<number>(`SELECT COUNT(*) FROM course`),
    offerings: scalar<number>(`SELECT COUNT(*) FROM course_offering`),
    enrollments: scalar<number>(`SELECT COUNT(*) FROM enrollment`),
    users: scalar<number>(`SELECT COUNT(*) FROM sys_user`),
  };

  console.log('[seed] 演示数据写入完成，耗时 %dms', Date.now() - startedAt);
  console.table(summary);
  const demoStudent = all<{ student_no: string }>(
    `SELECT student_no FROM student ORDER BY student_no LIMIT 1`,
  )[0];
  console.log('  管理员账号：admin / admin123');
  console.log(`  教师账号：T0001 / 123456（全部教师账号密码均为 123456）`);
  console.log(`  学生账号：${demoStudent?.student_no ?? '-'} / 123456（全部学生账号密码均为 123456）`);
}

if (require.main === module) {
  seed();
}
