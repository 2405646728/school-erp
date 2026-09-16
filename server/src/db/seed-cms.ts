/**
 * 官网（前台站点）演示内容：轮播图、新闻公告、单页、站点设置
 * 独立于教务数据，可单独执行：npx tsx src/db/seed-cms.ts
 */
import { db, scalar, transaction } from './index';

const SETTINGS: [string, string, string][] = [
  ['site_name', '启明大学', '站点名称'],
  ['site_slogan', '明德 · 格物 · 笃行 · 致远', '校训 / 标语'],
  ['site_keywords', '启明大学,高校,本科招生,研究生教育,教务系统', 'SEO 关键词'],
  [
    'site_description',
    '启明大学是一所以工为主，理、工、经、管、文、法多学科协调发展的综合性大学，设有 6 个学院、19 个本科专业，全日制在校生万余人。',
    'SEO 描述',
  ],
  ['icp', '京ICP备2025000000号-1', '备案号'],
  ['address', '北京市海淀区启明路 1 号', '学校地址'],
  ['postcode', '100084', '邮政编码'],
  ['phone', '010-62785000', '联系电话'],
  ['admission_phone', '010-62785100', '招生咨询电话'],
  ['email', 'office@university.edu.cn', '联系邮箱'],
  ['copyright', '© 2020-2026 启明大学 版权所有', '版权信息'],
];

const BANNERS: [string, string, string | null, string | null][] = [
  [
    '启明大学 2025 级新生开学典礼隆重举行',
    '万余名新生齐聚明德广场，开启人生新篇章',
    'linear-gradient',
    '/news',
  ],
  [
    '2026 年本科招生章程发布',
    '19 个本科专业面向全国 31 个省份招生',
    'linear-gradient',
    '/page/admissions',
  ],
  [
    '我校计算机科学与技术学院团队获国家级教学成果奖',
    '以工程实践能力培养为核心的课程体系改革见成效',
    'linear-gradient',
    '/news',
  ],
  [
    '校园开放日：走进启明，遇见未来',
    '每月第三个周六，欢迎考生与家长来校参观',
    'linear-gradient',
    '/page/campus',
  ],
];

interface ArticleSeed {
  title: string;
  category: string;
  summary: string;
  author: string;
  source: string;
  tags: string;
  isTop: number;
  days: number;
  viewCount: number;
  content: string;
}

const ARTICLES: ArticleSeed[] = [
  {
    title: '启明大学 2025 级新生开学典礼隆重举行',
    category: '学校新闻',
    summary: '万余名新生齐聚明德广场，校长寄语新同学：把个人成长融入时代发展，做有理想、有本领、有担当的启明人。',
    author: '党委宣传部',
    source: '启明大学新闻网',
    tags: '开学典礼,新生',
    isTop: 1,
    days: 6,
    viewCount: 3820,
    content: `
      <p>9 月 6 日上午，启明大学 2025 级新生开学典礼在明德广场隆重举行。校领导、各学院负责人、教师代表与万余名本科、研究生新生共同参加了典礼。</p>
      <h3>校长寄语：把成长融入时代</h3>
      <p>校长在致辞中表示，大学阶段是人生中最重要的成长窗口期，希望同学们打好专业基础、保持好奇之心、学会与人协作，把个人成长融入国家发展与时代进步之中。</p>
      <h3>教师代表与新生代表发言</h3>
      <p>计算机科学与技术学院张启明教授作为教师代表发言，勉励同学们在课堂上多提问、在实验室多动手。新生代表分享了自己选择启明大学的心路历程。</p>
      <p>典礼结束后，各学院分别组织了新生入学教育活动，带领同学们熟悉校园、了解专业培养方案。</p>
    `,
  },
  {
    title: '关于 2025-2026 学年第一学期选课工作的通知',
    category: '通知公告',
    summary: '本学期选课分为预选、正选、补退选三个阶段，请同学们在规定时间内登录教务系统完成选课。',
    author: '教务处',
    source: '教务处',
    tags: '选课,教务',
    isTop: 1,
    days: 3,
    viewCount: 5140,
    content: `
      <p>各学院、各位同学：</p>
      <p>2025-2026 学年第一学期选课工作即将开始，现将有关事项通知如下：</p>
      <h3>一、选课时间</h3>
      <ul>
        <li>预选阶段：9 月 8 日 9:00 — 9 月 11 日 17:00</li>
        <li>正选阶段：9 月 12 日 9:00 — 9 月 15 日 17:00</li>
        <li>补退选阶段：9 月 16 日 — 9 月 26 日</li>
      </ul>
      <h3>二、选课要求</h3>
      <p>1. 每位同学每学期选课学分原则上不超过 30 学分；<br />2. 专业必修课由系统按班级预置，无需自行选择；<br />3. 通识选修课容量有限，先到先得，请合理安排时间尽早选课。</p>
      <h3>三、其他说明</h3>
      <p>选课过程中如遇系统问题，请联系教务处教务科（电话 010-62785100）。</p>
    `,
  },
  {
    title: '我校计算机科学与技术学院获国家级教学成果奖',
    category: '学校新闻',
    summary: '以工程实践能力培养为核心的课程体系改革取得实效，相关成果面向全国高校推广。',
    author: '教务处',
    source: '启明大学新闻网',
    tags: '教学成果,计算机',
    isTop: 0,
    days: 12,
    viewCount: 2410,
    content: `
      <p>近日，国家级教学成果奖评选结果公布，我校计算机科学与技术学院申报的《面向复杂工程问题的程序设计课程群建设与实践》荣获二等奖。</p>
      <h3>十年磨一课</h3>
      <p>该项目围绕程序设计类课程群，构建了“案例驱动—项目实训—竞赛提升”三阶递进的培养路径，累计覆盖在校学生 6000 余人次。</p>
      <h3>学生受益面广</h3>
      <p>近三年，参与课程改革的学生在各类学科竞赛中获奖数量增长明显，毕业生工程实践能力获得用人单位普遍认可。</p>
    `,
  },
  {
    title: '人工智能前沿论坛（第 12 期）将于本月举办',
    category: '学术活动',
    summary: '本期论坛邀请到国内知名学者，围绕大模型与智能系统作主题报告，欢迎师生参加。',
    author: '科研处',
    source: '人工智能研究院',
    tags: '学术报告,人工智能',
    isTop: 0,
    days: 2,
    viewCount: 960,
    content: `
      <p>为促进学术交流、拓展师生视野，人工智能前沿论坛（第 12 期）将于本月 20 日在信息楼报告厅举办。</p>
      <h3>报告安排</h3>
      <ul>
        <li>14:00-15:30 主题报告：大模型时代的智能系统建设</li>
        <li>15:45-17:00 圆桌讨论：从实验室到产业应用</li>
      </ul>
      <p>本次论坛面向全校师生开放，无需报名，座位有限，请提前入场。</p>
    `,
  },
  {
    title: '2026 年本科招生章程',
    category: '招生信息',
    summary: '启明大学 2026 年面向全国 31 个省份招生，19 个本科专业，实行大类招生与专业分流相结合的培养模式。',
    author: '招生办公室',
    source: '招生办公室',
    tags: '招生,本科',
    isTop: 0,
    days: 20,
    viewCount: 8760,
    content: `
      <p>为保证招生工作顺利进行，规范招生行为，维护考生合法权益，根据教育部有关规定，结合我校实际情况，制定本章程。</p>
      <h3>一、学校概况</h3>
      <p>启明大学是一所以工为主，理、工、经、管、文、法多学科协调发展的综合性大学，现有 6 个学院、19 个本科专业。</p>
      <h3>二、招生计划</h3>
      <p>2026 年我校面向全国 31 个省（自治区、直辖市）招生，具体分省分专业计划以各省级招生考试机构公布为准。</p>
      <h3>三、录取规则</h3>
      <p>1. 实行平行志愿投档的省份，按照投档成绩从高到低择优录取；<br />2. 专业分配遵循分数优先原则，不设专业级差；<br />3. 体检标准按教育部、卫生部有关规定执行。</p>
      <h3>四、咨询方式</h3>
      <p>招生咨询电话：010-62785100；邮箱：office@university.edu.cn。</p>
    `,
  },
  {
    title: '关于开展 2025 年度学生体质健康测试的通知',
    category: '通知公告',
    summary: '测试对象为全体在校本科生，请各学院组织学生按批次参加，缺测将影响毕业。',
    author: '体育部',
    source: '体育部',
    tags: '体测,通知',
    isTop: 0,
    days: 8,
    viewCount: 4120,
    content: `
      <p>各学院：</p>
      <p>根据教育部《国家学生体质健康标准》要求，我校将开展 2025 年度学生体质健康测试工作。</p>
      <h3>测试对象</h3>
      <p>全体在校本科生（含休学复学学生）。</p>
      <h3>测试项目</h3>
      <p>身高体重、肺活量、50 米跑、坐位体前屈、立定跳远、引体向上（男）/1 分钟仰卧起坐（女）、1000 米（男）/800 米（女）。</p>
      <h3>注意事项</h3>
      <p>请同学们提前做好热身，患有心脏病、哮喘等疾病的学生须提前提交免测申请。</p>
    `,
  },
  {
    title: '启明大学与三家企业签署产学研合作协议',
    category: '学校新闻',
    summary: '校企双方将在人才培养、实习实训、技术攻关等方面开展深度合作，共建联合实验室。',
    author: '科研处',
    source: '启明大学新闻网',
    tags: '产学研,合作',
    isTop: 0,
    days: 15,
    viewCount: 1580,
    content: `
      <p>近日，我校与三家行业龙头企业签署产学研合作协议，共建联合实验室与实习实训基地。</p>
      <p>根据协议，企业将每年提供不少于 200 个实习岗位，并派工程师参与相关专业的实践课程教学。</p>
      <p>副校长在签约仪式上表示，学校将持续推动产教融合，让学生在真实工程场景中锤炼本领。</p>
    `,
  },
  {
    title: '图书馆关于延长开馆时间的通知',
    category: '通知公告',
    summary: '考试月期间，主馆阅览区开放时间延长至 23:00，自习座位实行预约制。',
    author: '图书馆',
    source: '图书馆',
    tags: '图书馆,服务',
    isTop: 0,
    days: 5,
    viewCount: 2260,
    content: `
      <p>为满足同学们期末备考需求，图书馆自即日起延长开馆时间：</p>
      <ul>
        <li>周一至周五：7:30 — 23:00</li>
        <li>周六、周日：8:00 — 22:30</li>
      </ul>
      <p>自习座位可通过图书馆微信公众号预约，请勿占座。</p>
    `,
  },
  {
    title: '材料与化学前沿学术研讨会征稿通知',
    category: '学术活动',
    summary: '会议将于下月举行，现面向校内外征集论文摘要，截稿日期为月底。',
    author: '科研处',
    source: '材料与化学学院',
    tags: '征文,学术会议',
    isTop: 0,
    days: 9,
    viewCount: 640,
    content: `
      <p>材料与化学前沿学术研讨会拟于下月在我校召开，现面向校内外青年教师与研究生征集论文摘要。</p>
      <h3>征稿方向</h3>
      <ul>
        <li>新能源材料与器件</li>
        <li>绿色催化与化工过程强化</li>
        <li>材料计算与人工智能辅助设计</li>
      </ul>
      <p>摘要请于本月底前发送至会议邮箱，录用通知将于两周内发出。</p>
    `,
  },
  {
    title: '2025 年大学生创新创业训练计划立项名单公布',
    category: '通知公告',
    summary: '本年度共立项 128 项，其中国家级 24 项、省级 46 项，请各项目组按时开展研究。',
    author: '创新创业学院',
    source: '创新创业学院',
    tags: '创新创业,立项',
    isTop: 0,
    days: 11,
    viewCount: 3120,
    content: `
      <p>经学生申报、学院推荐、专家评审，2025 年大学生创新创业训练计划共立项 128 项。</p>
      <p>请各项目负责人于两周内登录系统完成任务书填报，并按照计划节点开展研究。中期检查安排在明年 3 月。</p>
    `,
  },
  {
    title: '我校学子在全国大学生数学建模竞赛中获佳绩',
    category: '学校新闻',
    summary: '共获全国一等奖 3 项、二等奖 6 项，获奖数量创历年新高。',
    author: '数学与统计学院',
    source: '启明大学新闻网',
    tags: '竞赛,数学建模',
    isTop: 0,
    days: 18,
    viewCount: 2740,
    content: `
      <p>2025 年全国大学生数学建模竞赛成绩揭晓，我校共派出 42 支队伍参赛，获得全国一等奖 3 项、二等奖 6 项，省级奖项 20 余项。</p>
      <p>近年来，学校持续加强数学类公共基础课建设，为学生参与高水平学科竞赛打下扎实基础。</p>
    `,
  },
  {
    title: '关于做好 2025 年家庭经济困难学生认定工作的通知',
    category: '通知公告',
    summary: '请需要申请认定的同学在规定时间内提交材料，各学院按程序开展民主评议。',
    author: '学生工作部',
    source: '学生工作部',
    tags: '资助,认定',
    isTop: 0,
    days: 14,
    viewCount: 1980,
    content: `
      <p>各学院、各位同学：</p>
      <p>为做好本学年家庭经济困难学生认定工作，现将有关事项通知如下：</p>
      <h3>认定程序</h3>
      <p>学生申请 → 班级民主评议 → 学院审核公示 → 学校审批。</p>
      <h3>材料提交</h3>
      <p>请于本月底前将申请表及相关证明材料交至所在学院学生工作办公室。</p>
    `,
  },
  {
    title: '校园开放日活动公告',
    category: '招生信息',
    summary: '每月第三个周六为校园开放日，考生和家长可预约参观实验室、图书馆与学生宿舍。',
    author: '招生办公室',
    source: '招生办公室',
    tags: '开放日,招生',
    isTop: 0,
    days: 22,
    viewCount: 4460,
    content: `
      <p>为方便广大考生和家长了解学校，我校每月第三个周六设为校园开放日。</p>
      <h3>活动内容</h3>
      <ul>
        <li>校园参观：教学楼、实验室、图书馆、学生宿舍</li>
        <li>专业咨询：各学院设咨询台，专业教师现场答疑</li>
        <li>招生政策解读：招生办公室集中宣讲</li>
      </ul>
      <p>请提前通过招生网预约，凭预约短信入校。</p>
    `,
  },
  {
    title: '关于招募 2026 年寒假社会实践团队的通知',
    category: '通知公告',
    summary: '面向全校学生招募社会实践团队，主题涵盖乡村振兴、科技支农、企业调研等方向。',
    author: '校团委',
    source: '校团委',
    tags: '社会实践,招募',
    isTop: 0,
    days: 7,
    viewCount: 1520,
    content: `
      <p>校团委现面向全校招募 2026 年寒假社会实践团队。</p>
      <h3>实践方向</h3>
      <ul>
        <li>乡村振兴与基层治理调研</li>
        <li>科技支农与企业走访</li>
        <li>红色文化寻访与理论宣讲</li>
      </ul>
      <p>每个团队 5-10 人，请于本月底前提交立项申报书。</p>
    `,
  },
];

const PAGES: {
  slug: string;
  title: string;
  subtitle: string;
  sortOrder: number;
  content: string;
}[] = [
  {
    slug: 'about',
    title: '学校概况',
    subtitle: '明德 · 格物 · 笃行 · 致远',
    sortOrder: 1,
    content: `
      <p>启明大学是一所以工为主，理、工、经、管、文、法多学科协调发展的综合性大学。学校现有 6 个学院、19 个本科专业，全日制在校生一万余人，专任教师近五十人，其中具有高级职称者占比过半。</p>
      <h3>历史沿革</h3>
      <p>学校前身可追溯至二十世纪中叶创办的工业专科学校，历经数十年的建设与发展，于本世纪初组建为多科性大学，形成了本科教育与研究生教育并重、工程实践特色鲜明的办学格局。</p>
      <h3>办学定位</h3>
      <p>学校坚持“以学生为中心、以能力为导向”的教育理念，围绕智能制造、信息技术、新能源、数字经济等方向布局学科专业，致力于培养基础扎实、实践能力强、具有创新精神的高素质人才。</p>
      <h3>校园环境</h3>
      <p>校园占地一千余亩，建有信息楼、电子楼、工程训练中心、图书馆等教学科研场所，学生公寓、体育场馆、餐饮服务等生活设施配套完善。</p>
      <h3>联系方式</h3>
      <p>地址：北京市海淀区启明路 1 号<br />邮编：100084<br />电话：010-62785000</p>
    `,
  },
  {
    slug: 'admissions',
    title: '招生信息',
    subtitle: '2026 年本科招生',
    sortOrder: 2,
    content: `
      <p>启明大学 2026 年面向全国 31 个省（自治区、直辖市）招生，共 19 个本科专业，学制四年，毕业授予学士学位。</p>
      <h3>招生专业一览</h3>
      <ul>
        <li><b>计算机科学与技术学院</b>：计算机科学与技术、软件工程、人工智能、数据科学与大数据技术</li>
        <li><b>电子信息工程学院</b>：电子信息工程、通信工程、自动化</li>
        <li><b>经济管理学院</b>：工商管理、会计学、国际经济与贸易</li>
        <li><b>外国语学院</b>：英语、日语、翻译</li>
        <li><b>机械与能源工程学院</b>：机械设计制造及其自动化、能源与动力工程、车辆工程</li>
        <li><b>数学与统计学院</b>：数学与应用数学、统计学、信息与计算科学</li>
      </ul>
      <h3>录取规则</h3>
      <p>1. 实行平行志愿投档的省份，按照投档成绩从高到低择优录取；<br />2. 专业分配遵循分数优先原则，不设专业级差；<br />3. 体检标准按教育部、卫生部有关规定执行。</p>
      <h3>学费与奖助</h3>
      <p>学校严格执行国家规定的收费标准，并建立了以国家奖助学金、助学贷款、勤工助学、困难补助为主的资助体系，确保家庭经济困难学生顺利完成学业。</p>
      <h3>咨询方式</h3>
      <p>招生咨询电话：010-62785100<br />邮箱：office@university.edu.cn<br />地址：北京市海淀区启明路 1 号（邮编 100084）</p>
    `,
  },
  {
    slug: 'campus',
    title: '校园生活',
    subtitle: '学习 · 生活 · 成长',
    sortOrder: 3,
    content: `
      <p>学校为同学们提供了良好的学习与生活环境，校园文化活动丰富，学生社团蓬勃发展。</p>
      <h3>学习空间</h3>
      <p>图书馆藏书丰富，设有自习区、研讨间与电子阅览区；各学院均建有面向本科生的实验教学中心，工程训练中心承担全校工程实践类课程。</p>
      <h3>住宿与餐饮</h3>
      <p>学生公寓分为紫荆、丁香、桃李三个区域，均为四人间，配备独立卫浴、空调与网络。校内设有三个学生食堂，另有风味餐厅与清真餐厅。</p>
      <h3>文化活动</h3>
      <p>学校每年举办科技文化节、运动会、迎新晚会、社团巡礼等活动；现有学术科技、文化艺术、体育健身、志愿公益类学生社团 60 余个。</p>
      <h3>校园开放日</h3>
      <p>每月第三个周六为校园开放日，欢迎考生和家长预约参观。</p>
    `,
  },
  {
    slug: 'contact',
    title: '联系方式',
    subtitle: '我们随时为你服务',
    sortOrder: 4,
    content: `
      <h3>学校办公室</h3>
      <p>电话：010-62785000<br />邮箱：office@university.edu.cn<br />办公时间：周一至周五 8:30-11:30，13:30-17:00</p>
      <h3>招生办公室</h3>
      <p>电话：010-62785100<br />办公地点：行政楼一层 105 室</p>
      <h3>教务处</h3>
      <p>电话：010-62785001<br />办公地点：行政楼二层 208 室</p>
      <h3>学生工作部</h3>
      <p>电话：010-62785002<br />办公地点：行政楼三层 312 室</p>
      <h3>到校路线</h3>
      <p>地铁：4 号线启明路站 A 口出，步行约 600 米<br />公交：特 4 路、331 路、601 路启明大学站下车</p>
    `,
  },
];

export function seedCms() {
  if (scalar<number>(`SELECT COUNT(*) FROM cms_article`) > 0) {
    console.log('[seed-cms] 官网内容已存在，跳过初始化');
    return;
  }

  const now = new Date();

  transaction(() => {
    const settingStmt = db.prepare(`INSERT INTO cms_setting (key, value, label) VALUES (?, ?, ?)`);
    for (const [key, value, label] of SETTINGS) settingStmt.run(key, value, label);

    const bannerStmt = db.prepare(
      `INSERT INTO cms_banner (title, subtitle, image, link, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    BANNERS.forEach(([title, subtitle, image, link], index) => {
      bannerStmt.run(title, subtitle, image, link, index + 1, '已发布');
    });

    const articleStmt = db.prepare(
      `INSERT INTO cms_article (title, category, summary, cover, content, author, source, tags, status,
                                is_top, view_count, seo_title, seo_keywords, seo_description, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const article of ARTICLES) {
      const published = new Date(now.getTime() - article.days * 24 * 3600 * 1000);
      const publishedAt = `${published.getFullYear()}-${String(published.getMonth() + 1).padStart(2, '0')}-${String(
        published.getDate(),
      ).padStart(2, '0')} ${String(9 + (article.days % 8)).padStart(2, '0')}:30:00`;
      articleStmt.run(
        article.title,
        article.category,
        article.summary,
        null,
        article.content.trim(),
        article.author,
        article.source,
        article.tags,
        '已发布',
        article.isTop,
        article.viewCount,
        `${article.title} - 启明大学`,
        article.tags,
        article.summary,
        publishedAt,
      );
    }

    const pageStmt = db.prepare(
      `INSERT INTO cms_page (slug, title, subtitle, content, seo_title, seo_keywords, seo_description, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const page of PAGES) {
      pageStmt.run(
        page.slug,
        page.title,
        page.subtitle,
        page.content.trim(),
        `${page.title} - 启明大学`,
        page.title,
        page.subtitle,
        '已发布',
        page.sortOrder,
      );
    }
  });

  console.log(
    `[seed-cms] 官网内容写入完成：轮播图 ${BANNERS.length} 条、文章 ${ARTICLES.length} 篇、单页 ${PAGES.length} 个、站点设置 ${SETTINGS.length} 项`,
  );
}

if (require.main === module) {
  seedCms();
}
