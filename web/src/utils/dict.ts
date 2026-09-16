/** 业务字典：状态色、枚举选项，供下拉与标签统一使用 */

export const GENDER_OPTIONS = ['男', '女'];
export const STUDENT_STATUS = ['在读', '休学', '毕业', '退学'];
export const TEACHER_STATUS = ['在职', '休假', '离职'];
export const TEACHER_TITLES = ['教授', '副教授', '讲师', '助教', '研究员'];
export const DEGREE_TYPES = ['专科', '本科', '硕士', '博士'];
export const COURSE_TYPES = ['必修', '选修', '通识', '实践'];
export const OFFERING_STATUS = ['开放选课', '已结束'];
export const CLASS_STATUS = ['在读', '已毕业'];
export const EXAM_TYPES = ['正常考试', '补考', '重修'];
export const POLITICAL_STATUS = ['共青团员', '中共预备党员', '中共党员', '群众', '民主党派'];
export const ACCOUNT_STATUS = ['启用', '停用'];

export const ROLE_LABELS: Record<string, string> = {
  admin: '系统管理员',
  teacher: '教师',
  student: '学生',
};

type TagType = 'primary' | 'success' | 'info' | 'warning' | 'danger';

const STATUS_TAG: Record<string, TagType> = {
  在读: 'success',
  休学: 'warning',
  毕业: 'info',
  退学: 'danger',
  在职: 'success',
  休假: 'warning',
  离职: 'info',
  启用: 'success',
  停用: 'info',
  开放选课: 'primary',
  已结束: 'info',
  已选: 'success',
  退选: 'info',
  已毕业: 'info',
};

export function statusTag(status: string | null | undefined): TagType {
  if (!status) return 'info';
  return STATUS_TAG[status] ?? 'info';
}

export function roleTag(role: string): TagType {
  if (role === 'admin') return 'danger';
  if (role === 'teacher') return 'warning';
  return 'primary';
}

/** 成绩等级：优秀 / 良好 / 中等 / 及格 / 不及格 */
export function scoreLevel(score: number | null | undefined) {
  if (score === null || score === undefined) return { text: '未录入', type: 'info' as TagType };
  if (score >= 90) return { text: '优秀', type: 'success' as TagType };
  if (score >= 80) return { text: '良好', type: 'primary' as TagType };
  if (score >= 70) return { text: '中等', type: 'info' as TagType };
  if (score >= 60) return { text: '及格', type: 'warning' as TagType };
  return { text: '不及格', type: 'danger' as TagType };
}

/** 学期选项（2021-2026 学年，供下拉兜底使用） */
export function semesterOptions(): string[] {
  const list: string[] = [];
  for (let year = 2026; year >= 2021; year -= 1) {
    list.push(`${year}-${year + 1}-2`, `${year}-${year + 1}-1`);
  }
  return list;
}

export function gradeYearOptions(): number[] {
  const current = new Date().getFullYear();
  const list: number[] = [];
  for (let year = current; year >= current - 8; year -= 1) list.push(year);
  return list;
}
