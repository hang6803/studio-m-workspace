// Requests M's brain has never seen (none of these are in src/brain.js), with the intent each should get.
// tools/test-brain.mjs checks that at least 90% come out right, so new examples can't quietly break old ones.
export const CTX = { names: ["Hang", "Mun", "Michael", "Aina"], drives: ["M1 2026", "M2 2026", "M3 2026"], jobs: new Set(["lim", "wedding", "genting", "launch", "rinjani", "deepavali", "open", "house", "sunway", "petronas", "gala", "tan"]) };
export const CASES = [
  ["which jobs haven't been backed up", "unbacked"], ["has Mun backed up everything", "unbacked"], ["Mun 还有没备份的吗", "unbacked"], ["还剩几个没备份", "unbacked"],
  ["what still needs backing up on M2", "unbacked"], ["not backed up 2025", "unbacked"], ["semua job dah backup?", "unbacked"], ["anything I haven't backed up", "unbacked"],
  ["what are we shooting next week", "shoots"], ["anything on this saturday", "shoots"], ["下周有什么活动要拍", "shoots"], ["明天要去哪里拍", "shoots"],
  ["what's Hang shooting this week", "shoots"], ["when's my next shoot", "shoots"], ["shooting esok ada tak", "shoots"], ["这礼拜的拍摄", "shoots"],
  ["where is Lim Wedding", "find"], ["Rinjani 放在哪个硬盘", "find"], ["which drive has the Genting Launch", "find"], ["找一下 Sunway", "find"],
  ["is the Deepavali Open House backed up", "find"], ["who edited Petronas Gala", "find"], ["Tan wedding dekat drive mana", "find"],
  ["add a shoot on 5 Dec", "add"], ["book Mun for a wedding on 12月3日", "add"], ["12月8日 在 Ipoh 拍 Tan 婚礼", "add"], ["schedule Genting launch on Dec 9", "add"],
  ["帮我加一个 12号 的拍摄", "add"], ["tambah shooting 20 Dec", "add"],
  ["what's on M1 2026", "drive"], ["M3 里面有哪些 job", "drive"], ["show me M2", "drive"], ["what drives are there", "drive"],
  ["what has Michael edited", "editor"], ["Mun 负责几个 job", "editor"], ["show my jobs", "editor"], ["Aina's workload", "editor"],
  ["how many jobs did we do in 2025", "count"], ["今年总共几个 job", "count"], ["give me the numbers", "count"], ["year overview", "count"],
  ["take me to settings", "go"], ["打开日历页面", "go"], ["go to the drives page", "go"], ["open the team page", "go"], ["回到首页", "go"],
  ["when is Mun's birthday", "birthday"], ["谁快生日了", "birthday"], ["any birthday this month", "birthday"],
  ["who's free on 12月5日", "free"], ["is Hang free this saturday", "free"], ["这周六谁有空", "free"], ["who can shoot tomorrow", "free"],
  ["recent jobs please", "recent"], ["最近有什么新的 job", "recent"], ["what was added lately", "recent"],
  ["I want to add a new job", "newjob"], ["新增一个备份", "newjob"], ["log a new backup", "newjob"],
  ["switch to light", "theme"], ["换成深色", "theme"], ["turn dark mode on", "theme"],
  ["what's today's date", "date"], ["今天是几号", "date"], ["what day is it today", "date"],
  ["hello there", "greet"], ["你好呀", "greet"], ["good morning M", "greet"],
  ["thanks a lot", "thanks"], ["谢谢你", "thanks"], ["thank u", "thanks"],
  ["what can you help with", "help"], ["你可以做什么", "help"], ["how do I use you", "help"]
];
