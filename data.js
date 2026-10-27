/* data.js — 种子数据（演示用，全部为虚构地点/人物，无真实姓名、学号、手机号、学校全称）
   要换成本校：只改 CAMPUSES 一个常量即可。 */

const CAMPUSES = [
  {
    id: 'east',
    name: '东校区',
    spots: {
      canteen: '第三食堂后门 · 靠墙长椅',
      library: '图书馆一层 · 自助寄存柜',
      dorm6: '六号楼下 · 门厅置物架',
      gym: '体育馆侧门 · 器材室窗口',
      teachA: 'A 座连廊 · 二层窗台',
      gate: '南门快递架 · 第三格'
    }
  },
  {
    id: 'north',
    name: '北校区',
    spots: {
      canteen: '二食堂侧门 · 回收台',
      library: '北图书馆 · 一层大厅',
      dorm6: '九号楼下 · 快递柜旁',
      gym: '风雨操场 · 西门',
      teachA: 'B 座一层 · 公告板下',
      gate: '北门 · 保安亭旁'
    }
  }
];

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'food', label: '食物' },
  { id: 'book', label: '教材' },
  { id: 'daily', label: '日用品' },
  { id: 'furniture', label: '家具' },
  { id: 'cloth', label: '服饰' },
  { id: 'spot', label: '名额' }
];

/* meters: 距离（米）  expires: 多少分钟后过期  qty: 剩余份数  value: 估算价值（元） */
const SEED = [
  {
    id: 'f1', title: '半个玛格丽特披萨（刚出炉）', cat: 'food', meters: 88, expires: 25, qty: 2, value: 18,
    spot: 'canteen', by: '食堂二楼窗口', note: '社团活动剩下的，两盒各半张，还热。自带盒子来装，别用手直接抓。',
    photo: 'food-pizza-slice', posted: '10 分钟前'
  },
  {
    id: 'f2', title: '轻食沙拉碗 ×2（未开封）', cat: 'food', meters: 210, expires: 40, qty: 2, value: 26,
    spot: 'library', by: '匿名同学', note: '点多了没动过，冷藏袋装着。介意的话可以不拿，别浪费就行。',
    photo: 'food-salad-bowl', posted: '18 分钟前'
  },
  {
    id: 'f3', title: '面包拼盘 · 早午餐剩下的', cat: 'food', meters: 620, expires: 240, qty: 6, value: 12,
    spot: 'teachA', by: '匿名同学', note: '院系茶歇剩下的可颂和小餐包，独立包装，晚上八点前自取。',
    photo: 'food-bread-plate', posted: '1 小时前'
  },
  {
    id: 'b1', title: '考研英语真题（近十年，有笔记）', cat: 'book', meters: 145, expires: 80, qty: 1, value: 45,
    spot: 'library', by: '研三学长', note: '笔记都在，作文部分有批注。只送给真的要考的人，别拿去卖。',
    photo: 'book-exam-english', posted: '32 分钟前'
  },
  {
    id: 'b2', title: '高数 / 线代教材一摞（四本）', cat: 'book', meters: 340, expires: 180, qty: 1, value: 68,
    spot: 'dorm6', by: '匿名同学', note: '搬宿舍带不走了，书脊有点旧，内页干净。一起拿走优先。',
    photo: 'book-math-stack', posted: '2 小时前'
  },
  {
    id: 'b3', title: '英文诗集（一本，扉页有签名）', cat: 'book', meters: 980, expires: 360, qty: 1, value: 39,
    spot: 'gate', by: '匿名同学', note: '读完了想让它继续被人读。放快递架第三格，自取，不用打招呼。',
    photo: 'book-poetry', posted: '3 小时前'
  },
  {
    id: 'd1', title: '未拆封笔记本套装（本＋笔）', cat: 'daily', meters: 60, expires: 45, qty: 5, value: 15,
    spot: 'teachA', by: '社团招新剩余', note: '招新发剩的，一共五套，放连廊窗台上。一个人拿一套就够了。',
    photo: 'daily-notebook-set', posted: '6 分钟前'
  },
  {
    id: 'd2', title: '马克杯＋桌面收纳托盘', cat: 'daily', meters: 1200, expires: 120, qty: 2, value: 22,
    spot: 'gate', by: '匿名同学', note: '杯子没磕碰，托盘有点划痕。要的话两个一起，别只拿杯子。',
    photo: 'daily-desk-mug', posted: '4 小时前'
  },
  {
    id: 'u1', title: '白色木梯凳（可当床头柜）', cat: 'furniture', meters: 96, expires: 35, qty: 1, value: 55,
    spot: 'dorm6', by: '毕业生', note: '六楼没电梯，自己上来搬。十一点前拿走，之后我就扔了。',
    photo: 'furniture-stool', posted: '12 分钟前'
  },
  {
    id: 'u2', title: '双人布沙发（绿色，有轻微使用痕迹）', cat: 'furniture', meters: 480, expires: 300, qty: 1, value: 200,
    spot: 'dorm6', by: '匿名同学', note: '宿舍放不下了。需要两个人抬，我可以帮忙叫上室友。',
    photo: 'furniture-sofa', posted: '5 小时前'
  },
  {
    id: 'c1', title: '纯棉短袖 ×3（洗过，M 码）', cat: 'cloth', meters: 260, expires: 70, qty: 3, value: 30,
    spot: 'gym', by: '匿名同学', note: '都洗过晒过，没有起球。身高 170 左右合适，不合适就别拿了。',
    photo: 'cloth-shirts', posted: '25 分钟前'
  },
  {
    id: 'c2', title: '白色圆领 T 恤（全新未穿）', cat: 'cloth', meters: 1050, expires: 480, qty: 2, value: 25,
    spot: 'gate', by: '匿名同学', note: '买错码了，标签还在。两个码各一件，先到先选。',
    photo: 'cloth-tee', posted: '6 小时前'
  },
  {
    id: 's1', title: '公开课前排座位 ×8（今晚 7 点）', cat: 'spot', meters: 130, expires: 60, qty: 8, value: 0,
    spot: 'teachA', by: '课程助教', note: '有人退课空出来的前排位置，想听的直接报名，不用票，报名字缩写就行。',
    photo: 'spot-lecture', posted: '40 分钟前'
  },
  {
    id: 's2', title: '社团开放日名额 ×4（含材料）', cat: 'spot', meters: 720, expires: 180, qty: 4, value: 20,
    spot: 'gym', by: '社团负责人', note: '材料费已由社团出，四个名额，来就送一套手工材料，不用交钱。',
    photo: 'spot-club', posted: '1 小时前'
  }
];
