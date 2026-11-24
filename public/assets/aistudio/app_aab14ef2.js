/* Mạch Ngôn V2 — app.js */
(function(){
'use strict';

/* ---------- tiện ích ---------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d');
const wc = s => String(s||'').trim().split(/\s+/).filter(Boolean).length;
const sentences = s => String(s||'').replace(/\s+/g,' ').trim().split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ỹ“"(\d])/u).map(x=>x.trim()).filter(x=>x.length>1);
const today = () => new Date().toISOString().slice(0,10);
const fmtDate = t => new Date(t).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),2600);}

/* lưu trữ cục bộ an toàn */
const LS_KEY='machngon.v2';
let mem = {};
function loadStore(){ try{ mem = JSON.parse(localStorage.getItem(LS_KEY)||'{}')||{}; }catch(e){ mem={}; } }
function saveStore(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(mem)); }catch(e){} }
const S = {
  get(k,d){ return mem[k]===undefined ? d : mem[k]; },
  set(k,v){ mem[k]=v; saveStore(); },
  push(k,v,max=200){ const a=S.get(k,[]); a.unshift(v); S.set(k,a.slice(0,max)); }
};
function logAct(text, href){ S.push('log',{t:Date.now(),text,href},40); }
loadStore();

/* ---------- hằng số ---------- */
const FIELDS = {
  vh:{n:'Văn học',ic:'📖',d:'Thơ, truyện, kịch, kí, văn học dân gian, văn học nước ngoài, lí luận và kĩ năng đọc – viết văn.'},
  nn:{n:'Ngôn ngữ & tiếng Việt',ic:'🔤',d:'Tu từ, ngữ dụng, phong cách, từ Hán Việt, ẩn dụ ý niệm, kí hiệu học.'},
  lt:{n:'Lập luận & nghị luận',ic:'⚖️',d:'Toulmin, ngụy biện, thiên kiến, Socrates, cấu trúc nghị luận xã hội.'},
  th:{n:'Triết học & tư tưởng',ic:'🏛️',d:'Hiện sinh, Aristotle, Khắc kỷ, Nho – Phật – Lão trong văn học.'},
  tt:{n:'Truyền thông số',ic:'📡',d:'Tin giả, ngôn ngữ quảng cáo, AI, văn bản đa phương thức.'},
  kh:{n:'Liên ngành',ic:'🔬',d:'Ẩn dụ khoa học, báo cáo nghiên cứu, sử liệu, phê bình sinh thái.'}
};
const LEVELS = {1:'Cơ bản',2:'Trung cấp',3:'Nâng cao'};
const COVER = {vh:'img/cover_vh.jpg',nn:'img/cover_nn.jpg',lt:'img/cover_lt.jpg',th:'img/cover_th.jpg',tt:'img/cover_tt.jpg',kh:'img/cover_kh.jpg'};
const JOURNEYS = [
 {id:'tdpb',t:'Nhập môn tư duy phản biện',d:'Tách sự kiện – diễn giải, đặt câu hỏi, nhận diện ngụy biện và thiên kiến, lập luận theo Toulmin.',ids:['su-kien-dien-giai-gia-dinh','phuong-phap-socrates','nguy-bien-thuong-gap','thien-kien-nhan-thuc','nguyen-tac-bac-ai','mo-hinh-lap-luan-toulmin']},
 {id:'tho',t:'Đọc thơ: từ trung đại đến hiện đại',d:'Đi từ luật thơ Đường, thơ Nôm đến Thơ mới và thơ tự do.',ids:['tho-duong-luat-thi-phap','nguyen-trai-canh-ngay-he','ho-xuan-huong-tu-tinh','nguyen-khuyen-thu-dieu','tho-moi-cai-toi','huy-can-trang-giang','doc-tho-tu-do','xuan-quynh-song']},
 {id:'truyen',t:'Giải mã truyện ngắn Việt Nam',d:'Người kể, điểm nhìn, tình huống truyện qua 6 truyện ngắn tiêu biểu.',ids:['diem-nhin-nguoi-ke-chuyen','thach-lam-hai-dua-tre','nam-cao-chi-pheo','nguyen-tuan-chu-nguoi-tu-tu','to-hoai-vo-chong-a-phu','kim-lan-vo-nhat','nguyen-minh-chau-chiec-thuyen']},
 {id:'hsg',t:'Lí luận văn học cho học sinh giỏi',d:'Hình tượng, phong cách, tiếp nhận, liên văn bản và cách viết bài nghị luận lí luận.',ids:['hinh-tuong-van-hoc','phong-cach-tac-gia','ly-thuyet-tiep-nhan','lien-van-ban','khong-gian-thoi-gian-nghe-thuat','chu-nghia-hien-thuc-lang-man','nghi-luan-van-hoc-hsg']},
 {id:'nlxh',t:'Nghị luận xã hội THPT',d:'Từ giả định ngầm đến bài 600 chữ có phản đề thuyết phục.',ids:['su-kien-dien-giai-gia-dinh','mo-hinh-lap-luan-toulmin','lap-luan-nhan-qua-loai-suy','nguy-bien-thuong-gap','nguyen-tac-bac-ai','cau-truc-nghi-luan-xa-hoi']},
 {id:'dangian',t:'Văn học dân gian & văn chính luận',d:'Ca dao, cổ tích, sử thi và nghệ thuật lập luận trong hịch, cáo, tuyên ngôn.',ids:['van-hoc-dan-gian-dac-trung','ca-dao-than-than-yeu-thuong','truyen-co-tich-cau-truc','su-thi-dam-san','hich-tuong-si','binh-ngo-dai-cao','tuyen-ngon-doc-lap']},
 {id:'kichki',t:'Kịch và kí',d:'Xung đột kịch, nhân vật bi kịch và cái tôi tài hoa trong tùy bút, bút kí.',ids:['dac-trung-kich','nguyen-huy-tuong-vu-nhu-to','luu-quang-vu-hon-truong-ba','nguyen-tuan-nguoi-lai-do-song-da','hoang-phu-ngoc-tuong-song-huong']},
 {id:'thegioi',t:'Văn học thế giới',d:'Shakespeare, Hugo, Chekhov, Kafka, Hemingway, Bashō.',ids:['shakespeare-hamlet','victor-hugo-nhan-dao','chekhov-nguoi-trong-bao','kafka-hoa-than','hemingway-tang-bang-troi','basho-haiku']},
 {id:'ngonngu',t:'Ngôn ngữ & tâm trí',d:'Ngôn ngữ ảnh hưởng tư duy thế nào: Sapir–Whorf, ẩn dụ ý niệm, hàm ngôn, kí hiệu.',ids:['ngon-ngu-va-tu-duy','an-du-y-niem','ngu-dung-hoc-va-ham-ngon','ki-hieu-hoc','an-du-trong-khoa-hoc']},
 {id:'hsgqg',t:'Luyện đề HSG quốc gia',d:'Bài viết tham khảo theo đề HSG quốc gia thật (do Mạch Ngôn biên soạn), kèm kĩ năng nghị luận lí luận văn học và nghị luận xã hội.',ids:['nghi-luan-van-hoc-hsg','hsgqg-2024-nlvh-kiet-tac-va-nguoi-doc','hsgqg-2025-nlvh-camus-nghe-si','cau-truc-nghi-luan-xa-hoi','hsgqg-2024-nlxh-trai-nghiem-chia-se','hsgqg-2025-nlxh-lang-nghe-thinh-lang']},
 {id:'congdanso',t:'Công dân số tỉnh táo',d:'Đọc tin, đọc quảng cáo, tranh luận trên mạng và dùng AI có trách nhiệm.',ids:['nhan-dien-tin-gia','ngon-ngu-quang-cao','dien-ngon-mang-xa-hoi','ai-va-dao-duc','van-ban-da-phuong-thuc']}
];
/* danh ngôn: chỉ dùng tác phẩm đã thuộc phạm vi công cộng */
const QUOTES = [
 ['Thiện căn ở tại lòng ta, / Chữ tâm kia mới bằng ba chữ tài.','Nguyễn Du, Truyện Kiều (phần kết tác phẩm)'],
 ['Việc nhân nghĩa cốt ở yên dân, / Quân điếu phạt trước lo trừ bạo.','Nguyễn Trãi, Bình Ngô đại cáo (bản dịch trong SGK)'],
 ['Học mà không suy nghĩ thì uổng công; suy nghĩ mà không học thì nguy hiểm.','Khổng Tử, Luận ngữ'],
 ['Một cuộc đời không được tự vấn thì không đáng sống.','Socrates, theo Platon – Biện từ'],
 ['Điều làm con người bối rối không phải là sự việc, mà là phán đoán của họ về sự việc.','Epictetus, Cẩm nang (Enchiridion), mục 5'],
 ['Đừng tưởng xuân tàn hoa rụng hết, / Đêm qua, sân trước, một cành mai.','Mãn Giác thiền sư, Cáo tật thị chúng (bản dịch thơ trong SGK Ngữ văn 10)'],
 ['Người thầy tốt nhất không trao câu trả lời mà khơi dậy câu hỏi.','Châm ngôn sư phạm, phỏng theo tinh thần Socrates'],
 ['Biết thì nói là biết, không biết thì nói là không biết, thế mới thật là biết.','Khổng Tử, Luận ngữ'],
 ['Chúng ta là những gì chúng ta lặp đi lặp lại.','Diễn ý từ Aristotle, Đạo đức học Nicomachus'],
 ['Hãy làm điều cần làm ngay bây giờ, như thể đó là việc cuối cùng của đời mình.','Marcus Aurelius, Suy tưởng, quyển II']
];
/* bí danh nhân vật/tác phẩm → bài đọc, dùng cho chế độ cục bộ */
const ALIASES = [
 [['mị','a phủ','pá tra','vợ chồng a phủ'],'to-hoai-vo-chong-a-phu'],
 [['chí phèo','thị nở','bá kiến'],'nam-cao-chi-pheo'],
 [['huấn cao','quản ngục','chữ người tử tù'],'nguyen-tuan-chu-nguoi-tu-tu'],
 [['tràng giang','huy cận'],'huy-can-trang-giang'],
 [['tràng','bà cụ tứ','vợ nhặt'],'kim-lan-vo-nhat'],
 [['thúy kiều','thuý kiều','trao duyên','thúy vân','thuý vân','kim trọng','truyện kiều'],'nguyen-du-truyen-kieu-trao-duyen'],
 [['tiểu thanh'],'nguyen-du-doc-tieu-thanh-ki'],
 [['chị em liên','hai đứa trẻ','phố huyện','thạch lam'],'thach-lam-hai-dua-tre'],
 [['trương ba','hàng thịt','đế thích'],'luu-quang-vu-hon-truong-ba'],
 [['vũ như tô','đan thiềm','cửu trùng đài'],'nguyen-huy-tuong-vu-nhu-to'],
 [['phùng','người đàn bà hàng chài','chiếc thuyền ngoài xa'],'nguyen-minh-chau-chiec-thuyen'],
 [['xuân tóc đỏ','số đỏ','tang gia'],'vu-trong-phung-so-do'],
 [['tây tiến','quang dũng'],'quang-dung-tay-tien'],
 [['việt bắc','tố hữu'],'to-huu-viet-bac'],
 [['xuân quỳnh'],'xuan-quynh-song'],
 [['nguyễn khoa điềm'],'nguyen-khoa-diem-dat-nuoc'],
 [['vội vàng','xuân diệu'],'xuan-dieu-voi-vang'],
 [['vĩ dạ','hàn mặc tử'],'han-mac-tu-day-thon-vi-da'],
 [['sông đà','người lái đò'],'nguyen-tuan-nguoi-lai-do-song-da'],
 [['sông hương','hoàng phủ ngọc tường'],'hoang-phu-ngoc-tuong-song-huong'],
 [['tự tình','hồ xuân hương'],'ho-xuan-huong-tu-tinh'],
 [['thu điếu','câu cá mùa thu','nguyễn khuyến'],'nguyen-khuyen-thu-dieu'],
 [['thương vợ','tú xương','trần tế xương','bà tú'],'tran-te-xuong-thuong-vo'],
 [['cảnh ngày hè','nguyễn trãi'],'nguyen-trai-canh-ngay-he'],
 [['cần giuộc','nguyễn đình chiểu'],'van-te-nghia-si-can-giuoc'],
 [['bình ngô','đại cáo'],'binh-ngo-dai-cao'],
 [['hịch tướng sĩ','trần quốc tuấn'],'hich-tuong-si'],
 [['tuyên ngôn độc lập'],'tuyen-ngon-doc-lap'],
 [['đăm săn'],'su-thi-dam-san'],
 [['tấm cám','cổ tích'],'truyen-co-tich-cau-truc'],
 [['ca dao','thân em'],'ca-dao-than-than-yeu-thuong'],
 [['hamlet','shakespeare'],'shakespeare-hamlet'],
 [['gregor','kafka','hóa thân','hoá thân'],'kafka-hoa-than'],
 [['santiago','hemingway','ông già và biển cả'],'hemingway-tang-bang-troi'],
 [['belikov','người trong bao','chekhov'],'chekhov-nguoi-trong-bao'],
 [['valjean','javert','victor hugo','những người khốn khổ'],'victor-hugo-nhan-dao'],
 [['haiku','bashō','basho'],'basho-haiku'],
 [['ngụy biện','nguỵ biện'],'nguy-bien-thuong-gap'],
 [['tin giả'],'nhan-dien-tin-gia'],
 [['trí tuệ nhân tạo','chatgpt','dùng ai','công cụ ai'],'ai-va-dao-duc'],
 [['hàm ngôn'],'ngu-dung-hoc-va-ham-ngon'],
 [['ẩn dụ'],'an-du-y-niem'],
 [['hạnh phúc'],'aristotle-duc-hanh'],
 [['tự do'],'triet-hoc-hien-sinh']
];
const STEPS = {
  debate:['Nêu lập trường','Soi giả định & bằng chứng','Đối diện phản ví dụ','Điều chỉnh lập luận','Tổng kết tiến bộ'],
  concept:['Cách hiểu ban đầu','Đặc điểm cốt lõi','Ví dụ & phản ví dụ','Tinh chỉnh ranh giới','Hoàn thiện định nghĩa'],
  read:['Xác định thể loại','Đọc chi tiết','Tìm quy luật nghệ thuật','Diễn giải có căn cứ','Viết đoạn cảm nhận']
};
const MODES = {
  debate:{n:'Tranh biện',ph:'Viết lập trường của bạn (ít nhất 3 câu: luận điểm, lí do, dẫn chứng)… Enter để gửi, Shift+Enter xuống dòng.',intro:'Nêu một quan điểm. AI ghi nhận điểm mạnh, chỉ ra đúng 1 điểm hở và hỏi 1 câu Socrates. Bạn tự sửa lập luận qua 5 bước.'},
  concept:{n:'Làm rõ khái niệm',ph:'Nhập khái niệm và cách hiểu của bạn, ví dụ: “Tình huống truyện là…”',intro:'Bạn tự định nghĩa một khái niệm, AI giúp bạn thử ranh giới của định nghĩa bằng ví dụ và phản ví dụ.'},
  read:{n:'Đọc văn bản văn học',ph:'Dán đoạn trích (thơ/truyện/kịch/kí) hoặc nêu cảm nhận của bạn về một chi tiết…',intro:'Đọc theo đặc trưng thể loại: AI không bình giảng hộ mà dẫn bạn tự phát hiện chi tiết, quy luật nghệ thuật và ý nghĩa.'},
  annotate:{n:'Soi lập luận',ph:'Dán một đoạn nghị luận (của bạn, của bạn bè hoặc trích báo)…',intro:'Tự tô vai trò từng câu theo mô hình Toulmin, rồi so với gợi ý.'},
  grade:{n:'Chấm theo tiêu chí',ph:'Dán đoạn văn/bài nghị luận của bạn (khuyến nghị 120–600 chữ)…',intro:'Nhận xét theo bảng 5 tiêu chí, kèm 1 việc nên sửa tiếp theo. AI không viết lại bài thay bạn.'}
};
const RUBRIC = [
 ['claim','Rõ ràng luận điểm','Lập trường mơ hồ','Nêu được lập trường','Lập trường rõ, có phạm vi'],
 ['evidence','Bằng chứng','Không có','Có ví dụ chung chung/cá nhân','Dữ kiện, chi tiết văn bản hoặc nguồn kiểm chứng được'],
 ['assumption','Giả định ngầm','Không nhận ra','Ngầm có nhưng chưa nêu','Tự nêu và biện minh'],
 ['counter','Xét phản đề','Bỏ qua','Có nhắc đến','Trả lời phản đề mạnh nhất'],
 ['wording','Dùng từ chính xác','Nhiều từ tuyệt đối/cảm xúc','Ít lỗi','Có từ giới hạn phù hợp']
];
const ROLES = [['claim','Luận điểm','--c-claim'],['ground','Căn cứ / bằng chứng','--c-ground'],['warrant','Lí lẽ – giả định','--c-warrant'],['qual','Từ giới hạn','--c-qual'],['reb','Phản bác','--c-reb']];
const ABS = ['luôn luôn','luôn','tất cả','mọi người','mọi','ai cũng','không ai','không bao giờ','hoàn toàn','chắc chắn','duy nhất','bao giờ cũng','tuyệt đối','100%','chỉ vì','chỉ có'];
const QUALS = ['có thể','thường','phần lớn','đa số','hầu hết','trong nhiều trường hợp','phần nào','ở mức độ','trừ khi','nếu','khi'];
const EVID = ['ví dụ','chẳng hạn','số liệu','theo ','nghiên cứu','khảo sát','chi tiết','câu thơ','câu văn','đoạn văn','hình ảnh','trích','như khi','minh chứng','dẫn chứng','thực tế'];
const COUNTER = ['tuy nhiên','mặc dù','có ý kiến','có người cho rằng','ngược lại','phản biện','trừ khi','song','dẫu vậy','mặt khác'];
const CAUSAL = ['vì','bởi','do đó','dẫn đến','khiến','nên','cho nên','vì vậy','vì thế'];
function hits(text, list){ const t=' '+text.toLowerCase()+' '; return list.filter(w => new RegExp('(^|[^\\p{L}])'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^\\p{L}])','u').test(t)); }

/* ---------- dữ liệu ---------- */
let LIB=[], BY={}, GL={}, TERMS=[];
async function loadData(){
  const [a,b] = window.__MN_DATA ? [window.__MN_DATA.lib, window.__MN_DATA.gloss] : await Promise.all([fetch('library.json').then(r=>r.json()), fetch('gloss.json').then(r=>r.json())]);
  LIB=a; GL=b;
  LIB.forEach(x=>{
    const txt=[x.s,...x.k,...x.q,...(x.e||[]),x.x,x.de||'',...(x.b||[]).flatMap(z=>[z.h,...z.p]),...(x.n||[]).flatMap(z=>[z.txt,z.task])].join(' ');
    x.words=wc(txt); x.min=Math.max(1,Math.ceil(x.words/200));
    x.idx=norm([x.t,x.a,x.g,x.s,x.w.join(' '),x.k.join(' ')].join(' '));
    BY[x.i]=x;
  });
  const set=new Set(); LIB.forEach(x=>x.w.forEach(w=>set.add(w)));
  TERMS=[...set].sort((p,q)=>p.localeCompare(q,'vi'));
}
const docsWithTerm = t => LIB.filter(x=>x.w.includes(t));
const isRead = id => S.get('read',[]).includes(id);
const isSaved = id => S.get('saved',[]).includes(id);
const statusOf = id => isRead(id)?'done':(S.get('opened',[]).includes(id)?'reading':'new');

/* ---------- AI (Claude qua artifact sample) ---------- */
let sample=null, aiState='checking';
function initAI(){
  try{
    if(!window.claude || !window.claude.use){ aiState='off'; return; }
    window.claude.use('sample').then(s=>{ sample=s; aiState=s?'on':'off'; refreshAIPill(); }).catch(()=>{ aiState='off'; refreshAIPill(); });
  }catch(e){ aiState='off'; }
}
function refreshAIPill(){ $$('.aipill').forEach(el=>el.outerHTML=aiPill()); }
function aiPill(){
  if(aiState==='on') return '<span class="pill aipill" title="Phản hồi do Claude tạo"><span class="dot on"></span>AI: Claude đang sẵn sàng</span>';
  if(aiState==='checking') return '<span class="pill aipill"><span class="dot"></span>Đang kết nối AI…</span>';
  return '<span class="pill aipill" title="Không kết nối được AI trong môi trường này. Mạch Ngôn dùng bộ phân tích theo quy tắc."><span class="dot off"></span>Chế độ cục bộ (không có AI)</span>';
}
async function askAI(prompt, onText, signal){
  if(!sample) throw {code:'unavailable',message:'AI chưa sẵn sàng'};
  const r = await sample(prompt, {onText:onText?({text})=>onText(text):undefined, cache:false, signal});
  return r.text;
}
async function askAIJSON(prompt){
  if(!sample) throw {code:'unavailable'};
  try{ if(typeof sample.json==='function'){ const v=await sample.json(prompt,{cache:false}); if(v && typeof v==='object') return v; } }catch(e){ if(e && (e.code==='rate_limited'||e.code==='not_granted')) throw e; }
  const t=(await sample(prompt,{cache:false})).text; const m=t.match(/\{[\s\S]*\}/); if(!m) throw {code:'parse'}; return JSON.parse(m[0]);
}
function aiErrText(e){
  const c=e&&e.code;
  if(c==='not_granted') return 'Bạn chưa cho phép trang dùng AI. Mạch Ngôn chuyển sang chế độ cục bộ; bạn có thể bấm “Thử lại với AI” để được hỏi quyền lần nữa.';
  if(c==='rate_limited') return 'AI đang quá tải hoặc bạn gửi quá nhanh. Hãy chờ khoảng một phút rồi thử lại. Nội dung bạn viết vẫn được giữ nguyên.';
  if(c==='unavailable') return 'Môi trường này không có AI. Phản hồi dưới đây do bộ phân tích cục bộ tạo ra.';
  if(/confirm|consent|permission|grant/i.test((e&&e.message)||'')) return 'Trang chưa được cấp quyền dùng Claude (bạn đã đóng hộp thoại xin quyền). Phản hồi dưới đây do chế độ cục bộ tạo. Bấm “Thử lại với AI” và chọn “Cho phép sử dụng Claude” để dùng AI.';
  return 'AI tạm thời không phản hồi. Phản hồi dưới đây do chế độ cục bộ tạo; nội dung bạn viết vẫn được giữ nguyên.';
}

/* markdown tối giản cho phản hồi AI */
function md(s){
  const lines=esc(s).split(/\n/); let out='', list=null;
  const inline=t=>t.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g,'$1<i>$2</i>').replace(/\[\[([a-z0-9-]+)\]\]/g,(m,id)=>BY[id]?`<a href="#doc-${id}">${esc(BY[id].t)}</a>`:'');
  const close=()=>{ if(list){ out+=`</${list}>`; list=null; } };
  for(const l of lines){
    let m;
    if(m=l.match(/^#{1,4}\s*(.+)/)){ close(); out+=`<h4>${inline(m[1])}</h4>`; }
    else if(m=l.match(/^\s*[-•*]\s+(.+)/)){ if(list!=='ul'){close();out+='<ul>';list='ul';} out+=`<li>${inline(m[1])}</li>`; }
    else if(m=l.match(/^\s*\d+[.)]\s+(.+)/)){ if(list!=='ol'){close();out+='<ol>';list='ol';} out+=`<li>${inline(m[1])}</li>`; }
    else if(l.trim()===''){ close(); }
    else { close(); out+=`<p>${inline(l)}</p>`; }
  }
  close(); return out;
}

/* ---------- phân tích cục bộ ---------- */
function detectWork(text){
  const t=' '+text.toLowerCase()+' ';
  for(const [keys,id] of ALIASES){ for(const k of keys){ const re=new RegExp('(^|[^\\p{L}])'+k.trim()+'(?=$|[^\\p{L}])','u'); if(re.test(t)) return BY[id]; } }
  return null;
}
function relatedDocs(text, n=3){
  const q=norm(text).split(/[^a-z0-9]+/).filter(w=>w.length>3);
  if(!q.length) return [];
  return LIB.map(x=>({x,s:q.reduce((a,w)=>a+(x.idx.includes(w)?1:0),0)})).filter(o=>o.s>1).sort((a,b)=>b.s-a.s).slice(0,n).map(o=>o.x);
}
function localScores(text){
  const sn=sentences(text).length, abs=hits(text,ABS), qu=hits(text,QUALS), ev=hits(text,EVID), co=hits(text,COUNTER), ca=hits(text,CAUSAL);
  const hasNum=/\d/.test(text), hasQuote=/[“"«].{4,}[”"»]/.test(text);
  const stance=/(cho rằng|theo em|theo tôi|tôi nghĩ|em nghĩ|quan điểm|cần|nên|không nên|phải|là )/i.test(text);
  const s={};
  s.claim = !stance?1:(qu.length&&sn>=2?3:2);
  s.evidence = (hasNum||hasQuote||/theo [A-ZĐ]/.test(text))&&ev.length?3:(ev.length||hasNum||hasQuote?2:1);
  s.assumption = /giả định|với điều kiện|tiền đề|điều này chỉ đúng/i.test(text)?3:(ca.length?2:1);
  s.counter = co.length>=2||(co.length&&/(nhưng|song|tuy vậy|dù vậy)/i.test(text))?3:(co.length?2:1);
  s.wording = abs.length===0&&qu.length?3:(abs.length<=1?2:1);
  const c={
    claim: s.claim===1?'Chưa thấy câu nêu lập trường rõ. Hãy mở đầu bằng một câu khẳng định quan điểm.':s.claim===2?'Lập trường có, nhưng chưa nói rõ phạm vi (đúng trong trường hợp nào).':'Lập trường rõ và có giới hạn phạm vi.',
    evidence: s.evidence===1?'Chưa có dẫn chứng cụ thể.':s.evidence===2?'Có dấu hiệu dẫn chứng nhưng còn chung; nên thêm chi tiết, số liệu hoặc trích dẫn có nguồn.':'Có dẫn chứng cụ thể (số liệu/trích dẫn/chi tiết).',
    assumption: s.assumption===3?'Bạn đã tự nêu điều kiện/giả định của lập luận.':'Hãy viết ra điều phải đúng thì lập luận của bạn mới đúng.',
    counter: s.counter===1?'Chưa xét ý kiến trái chiều.':s.counter===2?'Có nhắc tới ý kiến khác; hãy trả lời trực tiếp phản đề mạnh nhất.':'Có xét và trả lời phản đề.',
    wording: abs.length?('Có từ tuyệt đối hóa: “'+abs.join('”, “')+'”.'):(qu.length?'Dùng từ giới hạn hợp lí.':'Ít từ tuyệt đối, có thể thêm từ giới hạn (thường, phần lớn, trừ khi…).')
  };
  const order=['wording','evidence','counter','assumption','claim'];
  const weakest=order.slice().sort((a,b)=>s[a]-s[b])[0];
  const nextMap={wording:'Thay một từ tuyệt đối bằng từ giới hạn và nêu điều kiện cụ thể.',evidence:'Thêm 1 dẫn chứng kiểm chứng được (chi tiết văn bản, số liệu có nguồn).',counter:'Viết 2–3 câu nêu phản đề mạnh nhất rồi trả lời nó.',assumption:'Viết thêm 1 câu: “Lập luận này dựa trên giả định rằng…”.',claim:'Viết lại câu mở đầu thành một lập trường rõ ràng, có phạm vi.'};
  const allTop=Object.values(s).every(v=>v===3);
  return {scores:s, comments:c, next:allTop?'Các dấu hiệu đều tốt. Thử thách tiếp: chọn phản đề khó nhất bạn có thể nghĩ ra và trả lời nó bằng một dẫn chứng mới.':nextMap[weakest], abs, sn, ev, co};
}
function localReply(text, mode, step){
  const work=detectWork(text), abs=hits(text,ABS), ev=hits(text,EVID), qu=hits(text,QUALS);
  const first=text.split(/\s+/).slice(0,14).join(' ')+(wc(text)>14?'…':'');
  const dicho=/(chỉ|đơn thuần).{0,60}(không phải|chứ không|mà không)/i.test(text)||/(hoặc là|hay là).{0,60}(hoặc|hay)/i.test(text);
  const lit = work && work.f==='vh';
  let rec='', issue='', q='';
  if(mode==='concept'){
    rec = /\blà\b/.test(text)?`Bạn đã đưa ra một định nghĩa ban đầu: “${esc(first)}”.`:`Bạn đã nêu khái niệm cần làm rõ: “${esc(first)}”.`;
    const cq=['Đặc điểm nào là bắt buộc phải có, thiếu nó thì không còn là khái niệm này nữa?','Hãy đưa 1 ví dụ đúng và 1 trường hợp trông giống nhưng KHÔNG phải. Điều gì phân biệt chúng?','Định nghĩa của bạn có đang quá rộng (bao cả những thứ không thuộc) hay quá hẹp (bỏ sót trường hợp đúng) không?','Khái niệm này khác khái niệm gần nó nhất ở điểm nào?','Hãy viết lại định nghĩa trong 1 câu, gồm: loại chung + đặc điểm phân biệt.'];
    issue = /ví dụ|chẳng hạn/i.test(text)?'Bạn đã có ví dụ; giờ cần kiểm tra ranh giới: định nghĩa có loại được các trường hợp “na ná” không?':'Định nghĩa chưa kèm ví dụ nên chưa kiểm tra được ranh giới.';
    q=cq[Math.min(step,4)];
  } else if(mode==='read'){
    const g = work? work.g : (/[\n]/.test(text)&&text.split('\n').length>=3?'Thơ':'');
    rec = work?`Bạn đang đọc <b>${esc(work.t.split(':')[0])}</b> (${esc(work.g)}).`:'Bạn đã đưa văn bản/cảm nhận vào để đọc.';
    const devices=[]; if((text.match(/\?/g)||[]).length) devices.push('câu hỏi'); if(/\bnhư\b/i.test(text)) devices.push('phép so sánh (“như”)');
    const rep=(()=>{const c={};text.toLowerCase().split(/[^\p{L}]+/u).filter(w=>w.length>2).forEach(w=>c[w]=(c[w]||0)+1);return Object.entries(c).filter(([w,n])=>n>=3).map(([w])=>w).slice(0,3);})();
    if(rep.length) devices.push('từ lặp lại: '+rep.map(w=>'“'+w+'”').join(', '));
    issue = devices.length?('Có vài dấu hiệu hình thức đáng chú ý: '+devices.join('; ')+'. Đừng chỉ gọi tên, hãy hỏi chúng tạo ra hiệu quả gì.'):'Hãy bắt đầu từ chi tiết: tìm 2–3 từ ngữ, hình ảnh khác thường nhất trong đoạn.';
    const rq=['Văn bản thuộc thể loại nào? Đặc trưng thể loại ấy gợi ý em nên chú ý điều gì trước tiên?','Chi tiết/từ ngữ nào khiến em dừng lại lâu nhất? Vì sao?','Các chi tiết ấy có lặp lại, đối lập hay biến đổi theo một quy luật nào không?','Từ quy luật đó, em diễn giải ý nghĩa của văn bản thế nào? Căn cứ ở đâu?','Hãy viết 3–5 câu cảm nhận: luận điểm – chi tiết – phân tích – nhận xét.'];
    q = (work && step>=1 && work.q[step-1]) ? work.q[step-1] : rq[Math.min(step,4)];
  } else {
    rec = `Bạn đã nêu lập trường: “${esc(first)}”.` + (ev.length?' Bạn cũng đã có ý dẫn chứng – đó là điểm tốt.':'') + (lit?` Vấn đề này gắn với <b>${esc(work.t.split(':')[0])}</b>.`:'');
    if(dicho && abs.length) issue=`Từ “${abs[0]}” cùng cấu trúc “chỉ… không phải…” đặt hai nguyên nhân thành hai lựa chọn loại trừ nhau. Đây có thể là <b>song đề giả</b>: liệu cả hai yếu tố có cùng tác động${lit?' trong diễn biến tâm lí nhân vật':''}?`;
    else if(abs.length) issue=`Từ tuyệt đối hóa “${abs[0]}” khiến chỉ cần một phản ví dụ là lập luận lung lay. Có trường hợp nào nhận định này không đúng?`;
    else if(!ev.length) issue= lit?'Nhận định chưa dựa vào chi tiết cụ thể trong văn bản. Một diễn giải văn học cần có căn cứ từ câu chữ, chi tiết, hành động của nhân vật.':'Lập luận chưa có dẫn chứng cụ thể (dữ kiện, ví dụ kiểm chứng được).';
    else if(!qu.length && hits(text,CAUSAL).length) issue='Bạn dùng quan hệ nhân quả. Đã loại trừ những nguyên nhân khác chưa, hay đó chỉ là hai hiện tượng xảy ra cùng lúc?';
    else issue='Lập luận còn một giả định ngầm chưa nói ra. Điều gì phải đúng thì kết luận của bạn mới đúng?';
    const dq=['Bằng chứng hoặc chi tiết nào khiến bạn tin nhất vào lập trường này?','Lập luận của bạn ngầm giả định điều gì? Giả định đó có luôn đúng không?','Người phản đối mạnh nhất sẽ đưa ra phản ví dụ nào? Bạn trả lời ra sao?','Sau khi xét phản ví dụ, bạn muốn giữ, thu hẹp hay thay đổi lập trường? Viết lại trong 1–2 câu.','So với câu đầu tiên, lập luận của bạn đã thay đổi ở đâu? Điều gì làm nó mạnh hơn?'];
    q = (lit && step<=2 && work.q[0]) ? work.q[0] : dq[Math.min(step,4)];
  }
  const rel = work?[work]:relatedDocs(text,1);
  let out=`### Ghi nhận\n${rec}\n### Điểm cần soi\n${issue}\n### Câu hỏi Socrates\n${q}`;
  if(mode==='debate' && abs.length) out+=`\n### Gợi ý mẫu câu\n“Điều này đúng trong trường hợp…, trừ khi…”`;
  if(rel.length) out+=`\n### Đọc thêm\n[[${rel[0].i}]]`;
  return out.replace(/<b>(.*?)<\/b>/g,'**$1**');
}

/* ---------- prompt cho Claude ---------- */
const LV_TXT={1:'Cơ bản: dùng từ ngữ đơn giản, ví dụ gần gũi với học sinh lớp 10.',2:'Trung cấp: có thể dùng thuật ngữ quen thuộc của môn Ngữ văn và tư duy phản biện, giải thích ngắn khi cần.',3:'Nâng cao (định hướng học sinh giỏi): có thể dùng thuật ngữ lí luận văn học, logic học; đòi hỏi lập luận chặt hơn.'};
function labPrompt(sess){
  const m=sess.mode, step=sess.step, last=sess.msgs.filter(x=>x.r==='u').slice(-1)[0]?.t||'';
  const rel=(detectWork(last)?[detectWork(last)]:[]).concat(relatedDocs(sess.msgs.map(x=>x.t).join(' '),4)).slice(0,4);
  const modeTxt={
    debate:`Chế độ TRANH BIỆN, bước ${step+1}/5 (${STEPS.debate.join(' → ')}). Bước hiện tại: "${STEPS.debate[step]}". Câu hỏi của bạn phải phục vụ bước này.`,
    concept:`Chế độ LÀM RÕ KHÁI NIỆM, bước ${step+1}/5 (${STEPS.concept.join(' → ')}). Bước hiện tại: "${STEPS.concept[step]}". Dùng ví dụ và phản ví dụ để thử ranh giới định nghĩa của học sinh.`,
    read:`Chế độ ĐỌC VĂN BẢN VĂN HỌC, bước ${step+1}/5 (${STEPS.read.join(' → ')}). Bước hiện tại: "${STEPS.read[step]}". Hướng học sinh đọc theo đặc trưng thể loại (thơ: hình ảnh, nhạc điệu, chủ thể trữ tình; truyện: người kể, điểm nhìn, tình huống, chi tiết; kịch: xung đột, lời thoại; kí: cái tôi tác giả, tính xác thực). Không bình giảng thay học sinh.`
  }[m];
  const head=`Bạn là "Trợ lý tư duy Mạch Ngôn" — nền tảng học tư duy ngôn ngữ cho học sinh THPT Việt Nam, đặc biệt môn Ngữ văn.
NGUYÊN TẮC: Dạy theo phương pháp Socrates. KHÔNG viết bài hộ, KHÔNG đưa đáp án hoàn chỉnh, KHÔNG khen chung chung. Trả lời bằng tiếng Việt chuẩn, tối đa khoảng 170 chữ.
${modeTxt}
TRÌNH ĐỘ: ${LV_TXT[sess.level]}
ĐỊNH DẠNG BẮT BUỘC (dùng đúng các tiêu đề Markdown sau):
### Ghi nhận
1–2 câu chỉ ra điểm mạnh CỤ THỂ, trích lại từ ngữ của học sinh.
### Điểm cần soi
Chỉ MỘT điểm hở quan trọng nhất (giả định ngầm, từ tuyệt đối hóa, thiếu bằng chứng, ngụy biện cụ thể, hiểu sai văn bản, định nghĩa quá rộng/hẹp…). Gọi tên lỗi nếu có.
### Câu hỏi Socrates
Đúng MỘT câu hỏi mở.
### Gợi ý mẫu câu
(Không bắt buộc) một khung câu để học sinh tự hoàn thành, ví dụ "Điều này đúng trong trường hợp…, trừ khi…".
${rel.length?`### Đọc thêm
(Không bắt buộc) Nếu phù hợp, gợi ý 1 bài trong thư viện bằng cú pháp [[mã-bài]], chỉ chọn trong danh sách: ${rel.map(x=>`[[${x.i}]] ${x.t}`).join('; ')}.`:''}
VỀ VĂN HỌC: Khi học sinh bàn về tác phẩm, yêu cầu bám chi tiết văn bản. Nếu không chắc chắn về một chi tiết, tình tiết hay câu chữ của tác phẩm, hãy nói rõ là không chắc và đề nghị học sinh kiểm tra lại văn bản; tuyệt đối không bịa trích dẫn. Không chép dài nguyên văn tác phẩm còn bản quyền.
AN TOÀN: Nếu nội dung không phù hợp lứa tuổi học sinh, nhẹ nhàng đưa cuộc trò chuyện về chủ đề học tập.`;
  const conv=sess.msgs.filter(x=>x.r!=='sys').map(x=>({role:x.r==='u'?'user':'assistant',content:x.t}));
  conv[0]={role:'user',content:head+'\n\n---\nLƯỢT ĐẦU CỦA HỌC SINH:\n'+conv[0].content};
  return conv;
}
function gradePrompt(text, topic){
  return `Bạn là giám khảo môn Ngữ văn THPT, chấm lập luận theo bảng tiêu chí của Mạch Ngôn. KHÔNG viết lại bài thay học sinh.
Tiêu chí (mỗi tiêu chí cho 1, 2 hoặc 3 điểm):
${RUBRIC.map(r=>`- ${r[0]} (${r[1]}): 1 = ${r[2]}; 2 = ${r[3]}; 3 = ${r[4]}`).join('\n')}
${topic?`Đề bài/ngữ cảnh: ${topic}\n`:''}Bài của học sinh:
"""${text}"""
Trả về DUY NHẤT một đối tượng JSON hợp lệ, không thêm chữ nào khác, theo mẫu:
{"scores":{"claim":2,"evidence":1,"assumption":2,"counter":1,"wording":2},"comments":{"claim":"…","evidence":"…","assumption":"…","counter":"…","wording":"…"},"next":"một việc cụ thể nên sửa tiếp theo","question":"một câu hỏi Socrates"}
Mỗi nhận xét tối đa 30 chữ, tiếng Việt, trích dẫn từ ngữ của học sinh khi có thể.`;
}
function annotatePrompt(sents){
  return `Phân loại vai trò của từng câu trong đoạn nghị luận theo mô hình Toulmin. Nhãn hợp lệ: "claim" (luận điểm), "ground" (căn cứ/bằng chứng), "warrant" (lí lẽ – giả định nối căn cứ với luận điểm), "qual" (câu chủ yếu giới hạn mức độ khẳng định), "reb" (phản bác/ngoại lệ), "none" (dẫn dắt, không đóng vai trò lập luận).
Các câu:
${sents.map((s,i)=>`${i}. ${s}`).join('\n')}
Trả về DUY NHẤT JSON: {"roles":["claim","ground",...],"why":["lí do ngắn ≤15 chữ cho từng câu",...]} với đúng ${sents.length} phần tử mỗi mảng.`;
}
function localRole(s, i){
  const t=s.toLowerCase();
  if(hits(t,['tuy nhiên','ngược lại','có ý kiến','có người cho rằng','trừ khi','mặc dù','song']).length) return 'reb';
  if(hits(t,['ví dụ','chẳng hạn','theo','số liệu','khảo sát','nghiên cứu','chi tiết','trong tác phẩm','câu thơ']).length||/\d/.test(t)) return 'ground';
  if(hits(t,['bởi vì','vì','do đó','điều này cho thấy','nghĩa là','bởi lẽ']).length) return 'warrant';
  if(hits(t,['có thể','thường','trong nhiều trường hợp','phần lớn','ở mức độ']).length && wc(s)<22) return 'qual';
  if(i===0||hits(t,['cho rằng','cần','nên','phải','là điều']).length) return 'claim';
  return 'none';
}

/* ---------- khung trang ---------- */
const NAV=[['home','Trang chủ'],['library','AI Library'],['lab','AI Labs'],['paths','Hành trình'],['glossary','Thuật ngữ'],['dashboard','Tổng quan'],['notebook','Sổ tay'],['guide','Hướng dẫn'],['about','Giới thiệu']];
const ICON={
 home:'<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 library:'<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13"/>',
 lab:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
 paths:'<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h5a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h5"/>',
 notebook:'<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6zM6 3v18M10 8h5M10 12h5"/>'
};
function renderNav(route){
  const base=route.split('-')[0];
  const key=base==='doc'?'library':base;
  $('#nav').innerHTML=NAV.map(([k,n])=>`<a href="#${k}" class="${k===key?'on':''}" ${k===key?'aria-current="page"':''}>${n}</a>`).join('');
  $('#drawerPanel').innerHTML='<div class="kicker">Mạch Ngôn</div>'+NAV.map(([k,n])=>`<a href="#${k}" class="${k===key?'on':''}">${n}</a>`).join('')+'<a href="#start">Khảo sát học tập</a>';
  $('#bnav').innerHTML=[['home','Trang chủ'],['library','Library'],['lab','Labs'],['paths','Hành trình'],['notebook','Sổ tay']].map(([k,n])=>`<a href="#${k}" class="${k===key?'on':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">${ICON[k]}</svg>${n}</a>`).join('');
}
function setTitle(t){ document.title = t ? `${t} · Mạch Ngôn` : 'Mạch Ngôn V2 — Nền tảng học tư duy ngôn ngữ'; }

function route(){
  const h=(location.hash||'#home').slice(1)||'home';
  closeDrawer(); hidePop();
  renderNav(h);
  const v=$('#view');
  if(h.startsWith('doc-')) pageDoc(h.slice(4));
  else if(h.startsWith('library')) pageLibrary(h.split('-')[1]);
  else ({home:pageHome,lab:pageLab,paths:pagePaths,glossary:pageGlossary,guide:pageGuide,notebook:pageNotebook,dashboard:pageDashboard,about:pageAbout,start:pageStart}[h]||page404)();
  window.scrollTo(0,0); v.focus({preventScroll:true});
}

/* ---------- thẻ bài ---------- */
function stBadge(id){ const s=statusOf(id); return s==='done'?'<span class="chip g prog">✓ Đã đọc</span>':s==='reading'?'<span class="chip w prog">Đang đọc</span>':''; }
function docCard(x){
  return `<a class="card dcard" href="#doc-${x.i}">${stBadge(x.i)}
  <div class="row"><span class="chip b">${FIELDS[x.f].ic} ${esc(x.g)}</span></div>
  <h3>${esc(x.t)}</h3><p>${esc(x.s)}</p>
  <div class="meta"><span>${LEVELS[x.l]}</span>·<span>${x.min} phút đọc</span>·<span>${x.r.length} nguồn</span>${x.b?'·<span style="color:var(--ok)">Bài đầy đủ</span>':''}</div></a>`;
}

/* ---------- TRANG CHỦ ---------- */
function pageHome(){
  setTitle('');
  const q=QUOTES[Math.floor(Date.now()/864e5)%QUOTES.length];
  const vhGenres=new Set(LIB.filter(x=>x.f==='vh').map(x=>x.g)).size;
  const feat=['to-hoai-vo-chong-a-phu','huy-can-trang-giang','hsgqg-2025-nlvh-camus-nghe-si','nguy-bien-thuong-gap','ngu-dung-hoc-va-ham-ngon','nguyen-huy-tuong-vu-nhu-to'].map(i=>BY[i]);
  const prof=S.get('profile',null);
  const dstr=new Date().toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
  const tod=LIB[Math.floor(Date.now()/864e5)%LIB.length];
  $('#view').innerHTML=`
  <section class="wrap"><div class="heroPanel"><div class="in">
    <div>
      <div class="small" style="color:var(--brand);font-weight:500">Tri thức để hiểu · Tư duy để khám phá</div>
      <div class="bigBrand">MẠCH NGÔN</div>
      <p class="tagline">Nền tảng học tập và phát triển tư duy</p>
      <div class="glass quoteCard">
        <div class="qh"><span>❧ Danh ngôn hôm nay</span><span>${dstr}</span></div>
        <p class="quote" style="margin:10px 0 6px">“${esc(q[0])}”</p>
        <p class="small muted" style="margin:0">— ${esc(q[1])}</p>
      </div>
      <div class="row" style="margin-top:18px">
        <a class="btn pri" href="#doc-${tod.i}">Bắt đầu ngay →</a>
        <a class="btn" href="#guide">Phương pháp đọc</a>
        ${prof?'':'<a class="btn" href="#start">Khảo sát 2 phút</a>'}
      </div>
      <p class="small" style="margin-top:10px;color:var(--ink2)">Không cần tài khoản: đọc và dùng AI Labs ngay. Sổ tay lưu trên trình duyệt của bạn.</p>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">
      <a class="glass portal" href="#library"><span class="pic">📖</span><h2>AI Library</h2><p class="small" style="margin:0;color:var(--ink2)">Kho ${LIB.length} bài đọc về văn học, ngôn ngữ, lập luận và triết học, phân 3 cấp độ, có thuật ngữ tương tác và nguồn tham khảo.</p><div class="ft"><span>${LIB.length} bài · ${vhGenres} thể loại văn học</span><b>Vào AI Library →</b></div></a>
      <a class="glass portal" href="#lab"><span class="pic">💬</span><h2>AI Labs</h2><p class="small" style="margin:0;color:var(--ink2)">Phòng thí nghiệm tư duy: tranh biện, làm rõ khái niệm, đọc văn bản văn học, soi lập luận và chấm theo tiêu chí.</p><div class="ft"><span>5 chế độ · AI Socrates</span><b>Mở AI Labs →</b></div></a>
      <a class="glass portal" href="#doc-${tod.i}" style="grid-column:1/-1;min-height:0"><div class="kicker" style="margin:0">Gợi ý đọc hôm nay</div><b style="font-family:var(--serif);font-size:18px">${esc(tod.t)}</b><span class="small muted">${esc(tod.g)} · ${LEVELS[tod.l]} · ${tod.min} phút · ${esc(tod.q[0])}</span></a>
    </div>
  </div></div>
  ${spacesBar()}
  </section>
  <section class="wrap" style="margin-top:22px"><div class="stats">
    <div class="card stat"><b>${LIB.length}</b>bài đọc</div>
    <div class="card stat"><b>${vhGenres}</b>nhóm thể loại văn học</div>
    <div class="card stat"><b>${JOURNEYS.length}</b>hành trình tri thức</div>
    <div class="card stat"><b>${TERMS.length}</b>thuật ngữ có tra cứu</div>
  </div></section>
  <section class="section wrap">
    <h2>Cách thức hoạt động</h2>
    <div class="grid g3">
      <div class="card pad"><div class="kicker">Bước 1</div><h3>Khám phá học liệu trong AI Library</h3><p class="small muted">Đọc bài theo lĩnh vực hoặc theo hành trình; nhấn thuật ngữ gạch chân để tra nghĩa.</p></div>
      <div class="card pad"><div class="kicker">Bước 2</div><h3>Tương tác đối thoại trong AI Labs</h3><p class="small muted">Tự viết lập trường trước; AI ghi nhận, chỉ ra một điểm hở và hỏi một câu Socrates.</p></div>
      <div class="card pad"><div class="kicker">Bước 3</div><h3>Phát triển tư duy và xem tiến bộ</h3><p class="small muted">Chấm theo 5 tiêu chí, theo dõi bản đồ kỹ năng, xuất phiên để nộp hoặc ôn tập.</p></div>
    </div>
  </section>
  <section class="section wrap" style="padding-top:0">
    <div class="row between"><h2>Sáu lĩnh vực</h2><a href="#library">Xem toàn bộ AI Library →</a></div>
    <div class="grid g3">${Object.entries(FIELDS).map(([k,f])=>`<a class="card fieldCard cov" href="#library-${k}"><div class="img" style="background-image:url(${COVER[k]})" role="img" aria-label="Ảnh minh họa lĩnh vực ${f.n}"></div><div class="tx"><h3 style="margin:0">${f.ic} ${f.n}</h3><span class="small muted">${LIB.filter(x=>x.f===k).length} bài · ${esc(f.d)}</span></div></a>`).join('')}</div>
  </section>
  <section class="section wrap" style="padding-top:0">
    <div class="row between"><h2>Thư viện tài liệu nổi bật</h2><a href="#library">Xem toàn bộ →</a></div>
    <div class="grid g3">${feat.map(docCard).join('')}</div>
  </section>
  <section class="section wrap" style="padding-top:0">
    <div class="grid g2" style="align-items:start">
      <div>
        <div class="kicker">Một phiên AI Labs mẫu</div>
        <h2>AI hỏi, bạn nghĩ.</h2>
        <p>Mỗi lượt, trợ lý chỉ làm 3 việc: ghi nhận điểm mạnh, chỉ ra <b>một</b> điểm hở, đặt <b>một</b> câu hỏi. Lập luận cuối cùng vẫn là của bạn.</p>
        <p class="small"><b>Nêu lập trường</b> → <b>Soi giả định & bằng chứng</b> → <b>Đối diện phản ví dụ</b> → <b>Điều chỉnh lập luận</b> → <b>Tổng kết tiến bộ</b>. Cuối phiên, bài viết được chấm theo bảng 5 tiêu chí và ghi vào <a href="#dashboard">bản đồ kỹ năng</a>.</p>
        <a class="btn pri" href="#lab">Thử ngay</a>
      </div>
      <div class="chat demo">
        <div class="msg u">Em cho rằng Mị chạy theo A Phủ chỉ vì bản năng sống, không phải vì ý thức.</div>
        <div class="msg a"><h4>Ghi nhận</h4><p>Bạn nêu lập trường rõ và chọn đúng khoảnh khắc then chốt của truyện.</p><h4>Điểm cần soi</h4><p>Cấu trúc “chỉ… không phải…” đặt bản năng và ý thức thành hai lựa chọn loại trừ nhau, có thể là <b>song đề giả</b>.</p><h4>Câu hỏi Socrates</h4><p>Những chi tiết trước đêm cởi trói (tiếng sáo, giọt nước mắt của A Phủ) cho thấy điều gì về sự thức tỉnh của Mị?</p><div class="foot">Phiên mẫu, minh họa định dạng phản hồi</div></div>
      </div>
    </div>
  </section>`;
}

/* ---------- THƯ VIỆN ---------- */
let LF={q:'',f:'',g:'',l:'',st:'',sort:''};
function pageLibrary(field){
  setTitle('Thư viện');
  if(field && FIELDS[field]){ LF.f=field; LF.g=''; }
  $('#view').innerHTML=`<section class="wrap"><div class="pageHero" style="--hero:url(img/cover_lib.jpg)"><div class="in">
    <div class="kicker">Mạch Ngôn AI Library · Học liệu có nguồn tham khảo</div>
    <h1 style="color:var(--brand)">AI LIBRARY — THƯ VIỆN TRI THỨC</h1>
    <p style="max-width:760px;color:var(--ink2);font-family:var(--read);font-size:18px">Kho ${LIB.length} bài đọc về văn học, ngôn ngữ, lập luận, triết học, truyền thông số và liên ngành, phân 3 cấp độ Cơ bản, Trung cấp, Nâng cao, kèm thuật ngữ tương tác, câu hỏi tư duy và nguồn tham khảo. Thời lượng đọc tính tự động từ số chữ thực tế.</p>
    <div class="row small" style="gap:18px;color:var(--ink2)"><span>📖 <b>${LIB.length}</b> bài đọc</span><span>🗂 <b>6</b> lĩnh vực</span><span>🧭 <b>${JOURNEYS.length}</b> hành trình</span><span>✳ <b>${TERMS.length}</b> thuật ngữ</span></div>
    <div class="row" style="margin-top:14px"><a class="btn pri" href="javascript:void 0" onclick="document.getElementById('lq').focus()">Khám phá kho tài liệu</a><a class="btn" href="#paths">Xem Hành trình tri thức</a></div>
  </div></div></section>
  <section class="section wrap" style="padding-top:20px">
    <div class="filters card pad" role="search">
      <div class="q"><label class="f" for="lq">Tìm theo tên bài, tác giả, tác phẩm, thuật ngữ</label><input id="lq" type="search" placeholder="VD: Chí Phèo, hàm ngôn, ngụy biện, Hemingway…" value="${esc(LF.q)}"></div>
      <div><label class="f" for="lg">Thể loại / nhóm</label><select id="lg"></select></div>
      <div><label class="f" for="ll">Mức độ</label><select id="ll"><option value="">Tất cả</option>${Object.entries(LEVELS).map(([k,v])=>`<option value="${k}" ${LF.l==k?'selected':''}>${v}</option>`).join('')}</select></div>
      <div><label class="f" for="ls">Tiến độ</label><select id="ls"><option value="">Tất cả</option><option value="new">Chưa đọc</option><option value="reading">Đang đọc</option><option value="done">Đã đọc</option><option value="saved">Đã lưu</option></select></div>
      <div><label class="f" for="lo">Sắp xếp</label><select id="lo"><option value="">Mặc định</option><option value="az">Tên A → Z</option><option value="short">Ngắn trước</option><option value="lv">Dễ → khó</option></select></div>
    </div>
    <div class="fchips" role="tablist" aria-label="Lĩnh vực" id="lf"></div>
    <p class="small muted" id="lcount" aria-live="polite"></p>
    <div class="grid g3" id="lgrid"></div>
  </section>`;
  $('#ls').value=LF.st; $('#lo').value=LF.sort;
  const fillGenres=()=>{ const gs=[...new Set(LIB.filter(x=>!LF.f||x.f===LF.f).map(x=>x.g))]; if(!gs.includes(LF.g)) LF.g=''; $('#lg').innerHTML='<option value="">Tất cả</option>'+gs.map(g=>`<option ${g===LF.g?'selected':''}>${esc(g)}</option>`).join(''); };
  const chips=()=>{ $('#lf').innerHTML=`<button role="tab" aria-selected="${!LF.f}" class="${!LF.f?'on':''}" data-f="">Tất cả (${LIB.length})</button>`+Object.entries(FIELDS).map(([k,f])=>`<button role="tab" aria-selected="${LF.f===k}" class="${LF.f===k?'on':''}" data-f="${k}">${f.ic} ${f.n} (${LIB.filter(x=>x.f===k).length})</button>`).join(''); };
  const draw=()=>{
    const q=norm(LF.q).trim(); const saved=S.get('saved',[]);
    let a=LIB.filter(x=>(!LF.f||x.f===LF.f)&&(!LF.g||x.g===LF.g)&&(!LF.l||x.l==LF.l)&&(!q||q.split(/\s+/).every(w=>x.idx.includes(w)))
      &&(!LF.st||(LF.st==='saved'?saved.includes(x.i):statusOf(x.i)===LF.st)));
    if(LF.sort==='az') a=a.slice().sort((p,r)=>p.t.localeCompare(r.t,'vi'));
    if(LF.sort==='short') a=a.slice().sort((p,r)=>p.words-r.words);
    if(LF.sort==='lv') a=a.slice().sort((p,r)=>p.l-r.l);
    $('#lcount').textContent=`Hiển thị ${a.length} bài`+(LF.f?` · ${FIELDS[LF.f].n}`:'')+(LF.g?` · ${LF.g}`:'');
    $('#lgrid').innerHTML=a.length?a.map(docCard).join(''):'<div class="notice">Không tìm thấy bài phù hợp. Thử bỏ bớt bộ lọc hoặc dùng từ khóa khác.</div>';
  };
  fillGenres(); chips(); draw();
  $('#lq').addEventListener('input',e=>{LF.q=e.target.value;draw();});
  $('#lg').addEventListener('change',e=>{LF.g=e.target.value;draw();});
  $('#ll').addEventListener('change',e=>{LF.l=e.target.value;draw();});
  $('#ls').addEventListener('change',e=>{LF.st=e.target.value;draw();});
  $('#lo').addEventListener('change',e=>{LF.sort=e.target.value;draw();});
  $('#lf').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;LF.f=b.dataset.f;LF.g='';chips();fillGenres();draw();});
}

/* ---------- BÀI ĐỌC ---------- */
function linkTerms(html, terms, used){
  for(const t of terms){
    if(used.has(t)) continue;
    const re=new RegExp('(^|[^\\p{L}>])('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?=$|[^\\p{L}])','iu');
    if(re.test(html)){ html=html.replace(re,(m,a,b)=>`${a}<span class="term" tabindex="0" role="button" data-term="${esc(t)}">${b}</span>`); used.add(t); }
  }
  return html;
}
function sentSpans(text){ return sentences(text).map(s=>`<span class="sent">${esc(s)}</span>`).join(' '); }
function pageDoc(id){
  const x=BY[id]; if(!x) return page404();
  setTitle(x.t);
  const op=S.get('opened',[]); if(!op.includes(id)){ op.unshift(id); S.set('opened',op.slice(0,300)); logAct('Mở bài “'+x.t+'”','#doc-'+id); }
  const jr=JOURNEYS.find(j=>j.ids.includes(id) && j.id===S.get('activeJourney')) || JOURNEYS.find(j=>j.ids.includes(id));
  const ji=jr?jr.ids.indexOf(id):-1;
  const used=new Set();
  const lede=linkTerms(esc(x.s), x.w, used);
  const pts=x.k.map(k=>`<li>${linkTerms(esc(k), x.w, used)}</li>`).join('');
  const glossTerms=x.w.filter(t=>GL[t]);
  const quiz=buildQuiz(x);
  const secs=[...(x.de?[['s-de','Đề bài']]:[]),['s-tomluoc',x.de?'Hướng lập luận':'Tóm lược'],['s-ychinh',x.de?'Vì sao bài viết đạt yêu cầu cao':'Ý chính'],...(x.b||[]).map((z,i)=>['s-pt'+i,z.h]),...(x.e?[['s-vidu','Ví dụ tiếng Việt']]:[]),...(x.n?[['s-ngulieu','Ngữ liệu thực hành']]:[]),['s-cauhoi','Câu hỏi tư duy'],['s-viet','Viết lập trường của bạn'],...(quiz.length?[['s-kiemtra','Kiểm tra nhanh']]:[]),['s-baitap','Bài tập vận dụng'],['s-nguon','Nguồn tham khảo']];
  const pos=S.get('pos',{})[id]||'';
  const note=S.get('notes',{})[id]||'';
  const rel=LIB.filter(y=>y.i!==id&&(y.g===x.g||y.w.some(w=>x.w.includes(w)))&&!isRead(y.i)).slice(0,4);
  $('#view').innerHTML=`<section class="section wrap">
  <div class="small muted"><a href="#library">Thư viện</a> › <a href="#library-${x.f}">${FIELDS[x.f].n}</a> › ${esc(x.g)}</div>
  <div class="reader" style="margin-top:12px">
    <nav class="toc" aria-label="Mục lục bài"><div class="kicker">Mục lục</div>${secs.map(([a,n],i)=>`<a href="javascript:void 0" data-go="${a}">${i+1}. ${n}</a>`).join('')}
      <p class="annotate-note" style="margin-top:14px">Mẹo: nhấn vào thuật ngữ <span class="term">gạch chân chấm</span> để xem định nghĩa. Bật “Soi lập luận” rồi nhấn vào từng câu để tô vai trò.</p></nav>
    <article class="doc" id="art">
      <div class="row"><span class="chip b">${FIELDS[x.f].ic} ${esc(x.g)}</span><span class="chip">${LEVELS[x.l]}</span><span class="chip">${x.min} phút đọc · ${x.words} chữ</span>${x.b?'<span class="chip g">Bài đầy đủ</span>':''}${x.rv?`<span class="chip g">✓ Đã thẩm định: ${esc(x.rv)}</span>`:'<span class="chip w" title="Bài do nhóm biên soạn, đang chờ giáo viên thẩm định">Chờ thẩm định</span>'}</div>
      <div class="docBanner" style="background-image:url(${COVER[x.f]})" role="img" aria-label="Ảnh minh họa lĩnh vực ${FIELDS[x.f].n}"></div>
      <h1 style="margin-top:12px">${esc(x.t)}</h1>
      <p class="small muted" style="font-family:var(--sans)">${esc(x.a)} · Biên soạn: Nhóm Mạch Ngôn (có hỗ trợ AI) · ${x.r.length} nguồn tham khảo</p>
      <div class="toolbar" style="font-family:var(--sans)">
        <button class="btn sm" id="bSave">${isSaved(id)?'★ Đã lưu':'☆ Lưu bài'}</button>
        <button class="btn sm" id="bAnn" aria-pressed="false">🖍 Soi lập luận</button>
        <a class="btn sm" href="#lab" id="bLab">💬 Mở trong Lab</a>
        <span class="row" role="group" aria-label="Cỡ chữ"><button class="btn sm" data-fs="-1" aria-label="Giảm cỡ chữ">A−</button><button class="btn sm" data-fs="1" aria-label="Tăng cỡ chữ">A+</button></span>
      </div>
      <div id="annBar" hidden class="card pad" style="font-family:var(--sans);margin:8px 0">
        <div class="legend">${ROLES.map(r=>`<span><i style="background:var(${r[2]})"></i>${r[1]}</span>`).join('')}</div>
        <p class="small" style="margin:8px 0">Nhấn vào một câu để đổi vai trò lần lượt. Khi xong, bấm <b>So với gợi ý</b>.</p>
        <div class="row"><button class="btn sm pri" id="annCheck">So với gợi ý</button><button class="btn sm" id="annReset">Xóa tô</button><span class="small muted" id="annRes"></span></div>
      </div>
      ${x.de?`<div class="notice warn" style="font-family:var(--sans)"><b>Lưu ý:</b> Đây là <b>bài viết tham khảo do nhóm Mạch Ngôn biên soạn (có hỗ trợ AI)</b> theo đề thi HSG quốc gia thật, <b>không phải bài thi của học sinh đạt giải</b>. Dùng để phân tích cách lập luận, không dùng để học thuộc.</div>
      <h2 id="s-de">Đề bài</h2><div class="qbox"><b>Đề:</b> ${esc(x.de)}</div>`:''}
      <h2 id="s-tomluoc">${x.de?'Hướng lập luận':'Tóm lược'}</h2><p class="lede annSrc">${lede}</p>
      <h2 id="s-ychinh">${x.de?'Vì sao bài viết đạt yêu cầu cao':'Ý chính'}</h2><ol class="points annSrc">${pts}</ol>
      ${(x.b||[]).map((z,i)=>`<h2 id="s-pt${i}">${esc(z.h)}</h2>${z.p.map(pp=>`<p class="annSrc">${linkTerms(esc(pp),x.w,used)}</p>`).join('')}`).join('')}
      ${x.e?`<h2 id="s-vidu">Ví dụ tiếng Việt</h2><ul>${x.e.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`:''}
      ${x.n?`<h2 id="s-ngulieu">Ngữ liệu thực hành</h2>${x.f==='vh'?'<p class="small muted" style="font-family:var(--sans)">Văn bản tác phẩm đã được đối chiếu với văn bản sách giáo khoa và các nguồn giáo dục; những chỗ có dị bản được ghi ở dòng nguồn. Khi trích dẫn trong bài thi, hãy theo đúng sách em đang học.</p>':''}${x.n.map((z,i)=>`<div class="card pad" style="margin:12px 0;font-family:var(--sans)"><div class="row between"><b>${esc(z.t)}</b><span class="tiny muted">${esc(z.src)}</span></div><div style="white-space:pre-line;font-family:var(--read);font-size:1.02em;margin:10px 0;padding:12px 14px;border-left:3px solid var(--gold);background:var(--bg2);border-radius:8px">${esc(z.txt)}</div><p class="small" style="margin:6px 0"><b>Yêu cầu:</b> ${esc(z.task)}</p><button class="btn sm pri" data-nl="${i}">Phân tích trong AI Labs</button></div>`).join('')}`:''}
      <h2 id="s-cauhoi">Câu hỏi tư duy</h2>
      ${x.q.map((q,i)=>`<div class="qbox"><b>${i+1}.</b> ${esc(q)}<div class="row" style="margin-top:8px"><button class="btn sm" data-askq="${i}">Trả lời trong Lab</button></div></div>`).join('')}
      <h2 id="s-viet">Viết lập trường của bạn</h2>
      <div style="font-family:var(--sans)">
        <p class="small">Chọn một câu hỏi ở trên, viết 3–5 câu: <b>luận điểm → lí do → dẫn chứng → giới hạn</b>. Tự viết trước, rồi mới nhờ AI phản biện.</p>
        <textarea id="pos" aria-label="Lập trường của bạn" placeholder="Em cho rằng… vì… Chẳng hạn… Tuy nhiên, điều này chỉ đúng khi…">${esc(pos)}</textarea>
        <div class="row between" style="margin-top:8px"><span class="small muted" id="posInfo"></span>
          <div class="row"><button class="btn sm" id="posSave">Lưu vào sổ tay</button><button class="btn sm pri" id="posAI">Nhờ AI phản biện & chấm</button></div></div>
        <div id="posOut" aria-live="polite" style="margin-top:12px"></div>
      </div>
      ${quiz.length?`<h2 id="s-kiemtra">Kiểm tra nhanh</h2><div id="quiz" style="font-family:var(--sans)">${quiz.map((q,i)=>`<div class="qbox mcq" data-qi="${i}"><b>${i+1}. ${esc(q.q)}</b>${q.opts.map((o,j)=>`<button data-j="${j}">${esc(o)}</button>`).join('')}<div class="small" data-fb></div></div>`).join('')}</div>`:''}
      <h2 id="s-baitap">Bài tập vận dụng</h2><div class="qbox">${esc(x.x)}</div>
      <h2 id="s-nguon">Nguồn tham khảo</h2>
      <ol class="src">${x.r.map(r=>{const [t,u]=r.split(' | ');return `<li>${esc(t)}${u?` — <a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//,''))}</a>`:''}</li>`;}).join('')}</ol>
      <p class="small muted" style="font-family:var(--sans)">Nội dung bài là phần tóm lược, diễn giải phục vụ học tập, không thay thế việc đọc văn bản gốc. Phát hiện sai sót? Ghi vào Ghi chú và báo giáo viên.</p>
      <div class="row between card pad" style="font-family:var(--sans);margin-top:22px">
        <button class="btn ${isRead(id)?'':'pri'}" id="bRead">${isRead(id)?'✓ Đã đọc xong':'Đánh dấu đã đọc xong'}</button>
        ${jr?`<div class="row small">Hành trình <b>${esc(jr.t)}</b> · bài ${ji+1}/${jr.ids.length} ${ji>0?`<a class="btn sm" href="#doc-${jr.ids[ji-1]}">← Trước</a>`:''}${ji<jr.ids.length-1?`<a class="btn sm pri" href="#doc-${jr.ids[ji+1]}">Bài tiếp →</a>`:''}</div>`:''}
      </div>
    </article>
    <aside class="side">
      <div class="card"><h3>Thuật ngữ trọng tâm</h3>${x.w.map(t=>`<div style="margin:8px 0"><b>${esc(t)}</b><div class="small muted">${GL[t]?esc(GL[t]):'Xem cách dùng trong bài.'}</div>${docsWithTerm(t).length>1?`<div class="tiny">Cũng có trong: ${docsWithTerm(t).filter(y=>y.i!==id).slice(0,2).map(y=>`<a href="#doc-${y.i}">${esc(y.t.split(':')[0])}</a>`).join(', ')}</div>`:''}</div>`).join('')}</div>
      <div class="card"><h3>Ghi chú của bạn</h3><textarea id="note" aria-label="Ghi chú bài đọc" placeholder="Ghi lại câu hỏi, ý tưởng…" style="min-height:120px">${esc(note)}</textarea><p class="tiny muted">Tự động lưu trên trình duyệt này.</p></div>
      ${rel.length?`<div class="card"><h3>Đọc tiếp</h3>${rel.map(y=>`<div style="margin:6px 0"><a href="#doc-${y.i}">${esc(y.t)}</a><div class="tiny muted">${esc(y.g)} · ${y.min} phút</div></div>`).join('')}</div>`:''}
    </aside>
  </div></section>`;
  // TOC
  $$('.toc [data-go]').forEach(a=>a.addEventListener('click',()=>document.getElementById(a.dataset.go).scrollIntoView({behavior:'smooth'})));
  const obs=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ $$('.toc a').forEach(a=>a.classList.toggle('on',a.dataset.go===e.target.id)); } }),{rootMargin:'-10% 0px -80% 0px'});
  secs.forEach(([a])=>{const el=document.getElementById(a); if(el) obs.observe(el);});
  // font
  applyFs(); $$('[data-fs]').forEach(b=>b.addEventListener('click',()=>{ S.set('fs',Math.min(22,Math.max(15,S.get('fs',17)+(+b.dataset.fs)))); applyFs(); }));
  $('#bSave').onclick=()=>{ const s=S.get('saved',[]); const i=s.indexOf(id); if(i>=0)s.splice(i,1); else {s.unshift(id); logAct('Lưu bài “'+x.t+'”','#doc-'+id);} S.set('saved',s); $('#bSave').textContent=isSaved(id)?'★ Đã lưu':'☆ Lưu bài'; toast(isSaved(id)?'Đã lưu vào Sổ tay':'Đã bỏ lưu'); };
  $('#bRead').onclick=()=>{ const r=S.get('read',[]); if(!r.includes(id)){ r.unshift(id); S.set('read',r); logAct('Đọc xong “'+x.t+'”','#doc-'+id); toast('Đã ghi nhận tiến độ'); } $('#bRead').textContent='✓ Đã đọc xong'; $('#bRead').classList.remove('pri'); };
  $('#bLab').onclick=e=>{ e.preventDefault(); pendingLab={mode:x.f==='vh'?'read':'debate',docId:id,text:''}; location.hash='#lab'; };
  $$('[data-nl]').forEach(b=>b.onclick=()=>{ const z=x.n[+b.dataset.nl]; const m=z.mode||'debate'; pendingLab={mode:m,docId:id,text:(m==='annotate'||m==='grade')?z.txt:`Ngữ liệu: ${z.txt}\nYêu cầu: ${z.task}\nÝ kiến của em: `}; location.hash='#lab'; });
  $$('[data-askq]').forEach(b=>b.onclick=()=>{ pendingLab={mode:x.f==='vh'?'debate':'debate',docId:id,text:'',question:x.q[+b.dataset.askq]}; location.hash='#lab'; });
  $('#note').addEventListener('input',e=>{ const n=S.get('notes',{}); n[id]=e.target.value; if(!e.target.value) delete n[id]; S.set('notes',n); });
  const posEl=$('#pos'); const upd=()=>{ const n=sentences(posEl.value).length; $('#posInfo').textContent=`${wc(posEl.value)} chữ · ${n} câu`+(n<3?' · cần ít nhất 3 câu để nhờ AI phản biện':''); };
  posEl.addEventListener('input',()=>{ upd(); const p=S.get('pos',{}); p[id]=posEl.value; if(!posEl.value) delete p[id]; S.set('pos',p); }); upd();
  $('#posSave').onclick=()=>{ const p=S.get('pos',{}); p[id]=posEl.value; S.set('pos',p); logAct('Viết lập trường cho “'+x.t+'”','#doc-'+id); toast('Đã lưu vào Sổ tay'); };
  $('#posAI').onclick=()=>gradeInto(posEl.value, `Bài đọc: ${x.t}. Câu hỏi tư duy: ${x.q.join(' / ')}`, $('#posOut'), id);
  // quiz
  $$('#quiz .mcq').forEach(box=>box.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b||box.dataset.done) return; const q=quiz[+box.dataset.qi]; box.dataset.done=1; const j=+b.dataset.j;
    $$('button',box).forEach((bb,k)=>{ if(k===q.a) bb.classList.add('right'); }); if(j!==q.a) b.classList.add('wrong');
    $('[data-fb]',box).textContent= j===q.a?'Chính xác.':'Chưa đúng. Đáp án được tô xanh.'; }));
  // thuật ngữ
  $$('.term',$('#art')).forEach(t=>{ const sh=()=>showPop(t); t.addEventListener('click',sh); t.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();sh();}}); });
  // soi lập luận
  let annOn=false;
  $('#bAnn').onclick=()=>{ annOn=!annOn; $('#bAnn').setAttribute('aria-pressed',annOn); $('#annBar').hidden=!annOn; $('#art').classList.toggle('annot',annOn);
    if(annOn){ $$('.annSrc').forEach(el=>{ if(el.tagName==='OL'){ $$('li',el).forEach(li=>{ li.dataset.html=li.innerHTML; li.innerHTML=sentSpans(li.textContent); }); } else { el.dataset.html=el.innerHTML; el.innerHTML=sentSpans(el.textContent); } }); bindSents($('#art')); }
    else { $$('.annSrc').forEach(el=>{ if(el.tagName==='OL'){ $$('li',el).forEach(li=>{ if(li.dataset.html) li.innerHTML=li.dataset.html; }); } else if(el.dataset.html) el.innerHTML=el.dataset.html; }); $$('.term',$('#art')).forEach(t=>t.addEventListener('click',()=>showPop(t))); }
  };
  $('#annReset').onclick=()=>{ $$('.sent',$('#art')).forEach(s=>delete s.dataset.role); $('#annRes').textContent=''; };
  $('#annCheck').onclick=()=>compareRoles($$('.sent',$('#art')),$('#annRes'));
}
function applyFs(){ document.documentElement.style.setProperty('--fs',S.get('fs',17)+'px'); }
function bindSents(root){
  $$('.sent',root).forEach(s=>{ s.tabIndex=0; s.setAttribute('role','button');
    const cyc=()=>{ const order=['',...ROLES.map(r=>r[0])]; const cur=s.dataset.role||''; const nx=order[(order.indexOf(cur)+1)%order.length]; if(nx) s.dataset.role=nx; else delete s.dataset.role; s.title=nx?ROLES.find(r=>r[0]===nx)[1]:''; };
    s.addEventListener('click',cyc); s.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cyc();}}); });
}
async function compareRoles(spans, out){
  const sents=spans.map(s=>s.textContent);
  const mine=spans.map(s=>s.dataset.role||'none');
  if(mine.every(r=>r==='none')){ out.textContent='Hãy tô ít nhất một câu trước khi so.'; return; }
  out.innerHTML='<span class="typing"><i></i><i></i><i></i></span> Đang so…';
  let ref, why=[], src='Gợi ý cục bộ (theo từ khóa, chỉ để tham khảo)';
  if(sample){ try{ const v=await askAIJSON(annotatePrompt(sents)); if(Array.isArray(v.roles)&&v.roles.length===sents.length){ ref=v.roles; why=v.why||[]; src='Gợi ý của AI (có thể sai, hãy cân nhắc)'; } }catch(e){} }
  if(!ref) ref=sents.map((s,i)=>localRole(s,i));
  let agree=0, cnt=0;
  spans.forEach((s,i)=>{ if(mine[i]!=='none'||ref[i]!=='none'){ cnt++; if(mine[i]===ref[i]) agree++; }
    const lab=ROLES.find(r=>r[0]===ref[i]); s.title=`Gợi ý: ${lab?lab[1]:'không đóng vai trò lập luận'}${why[i]?' – '+why[i]:''}`; s.style.outline= mine[i]===ref[i]?'':'1.5px dashed var(--warn)'; });
  out.innerHTML=`${src}: khớp ${agree}/${cnt} câu. Câu viền cam là chỗ khác nhau, di chuột/nhấn giữ để xem gợi ý.`;
}
function buildQuiz(x){
  const ts=x.w.filter(t=>GL[t]).slice(0,3); const pool=Object.keys(GL);
  return ts.map((t,i)=>{ const wrong=pool.filter(p=>p!==t&&!x.w.includes(p)); const pick=[]; let seed=x.i.length*7+i*13;
    while(pick.length<2){ const p=wrong[(seed=(seed*31+17)%wrong.length)]; if(!pick.includes(p)) pick.push(p); }
    const opts=[GL[t],GL[pick[0]],GL[pick[1]]]; const order=[0,1,2].sort((a,b)=>((a*7+x.i.length+i)%3)-((b*7+x.i.length+i)%3));
    return {q:`“${t}” là gì?`,opts:order.map(k=>opts[k]),a:order.indexOf(0)}; });
}
let popEl=null;
function showPop(t){ hidePop(); const term=t.dataset.term; const ds=docsWithTerm(term);
  popEl=document.createElement('div'); popEl.className='pop'; popEl.setAttribute('role','tooltip');
  popEl.innerHTML=`<b>${esc(term)}</b>${GL[term]?esc(GL[term]):'Thuật ngữ trọng tâm của bài.'}${ds.length>1?`<div class="tiny" style="margin-top:6px;opacity:.8">Xuất hiện trong ${ds.length} bài · <a style="color:inherit;text-decoration:underline" href="#glossary">Mở bảng thuật ngữ</a></div>`:''}`;
  document.body.appendChild(popEl); const r=t.getBoundingClientRect(); const w=Math.min(320,innerWidth-20);
  popEl.style.left=Math.max(10,Math.min(r.left,innerWidth-w-10))+'px'; popEl.style.top=(r.bottom+8+popEl.offsetHeight>innerHeight? r.top-popEl.offsetHeight-8 : r.bottom+8)+'px'; }
function hidePop(){ if(popEl){ popEl.remove(); popEl=null; } }
document.addEventListener('click',e=>{ if(popEl && !e.target.closest('.term') && !e.target.closest('.pop')) hidePop(); });

/* chấm & phản biện (dùng chung cho bài đọc và Lab) */
async function gradeInto(text, topic, out, docId){
  const n=sentences(text).length;
  if(n<3){ out.innerHTML='<div class="notice warn">Hãy tự viết ít nhất 3 câu (luận điểm, lí do, dẫn chứng) trước khi nhờ AI phản biện. Đây là nguyên tắc “tự viết trước” của Mạch Ngôn.</div>'; return; }
  out.innerHTML='<div class="notice"><span class="typing"><i></i><i></i><i></i></span> Đang chấm theo 5 tiêu chí…</div>';
  let res, src='ai', err='';
  if(sample){ try{ res=await askAIJSON(gradePrompt(text,topic)); if(!res||!res.scores) throw {code:'parse'}; }catch(e){ err=aiErrText(e); res=null; } }
  if(!res){ res=localScores(text); src='local'; res.question='Nếu người phản đối mạnh nhất đọc đoạn này, họ sẽ bắt bẻ câu nào trước tiên?'; }
  RUBRIC.forEach(r=>{ res.scores[r[0]]=Math.max(1,Math.min(3,Math.round(+res.scores[r[0]]||1))); });
  S.push('scores',{t:Date.now(),s:res.scores,src,doc:docId||null,words:wc(text)},120);
  logAct('Chấm lập luận ('+(src==='ai'?'AI':'cục bộ')+')', docId?'#doc-'+docId:'#dashboard');
  out.innerHTML=rubricHTML(res, src, err);
}
function rubricHTML(res, src, err){
  const tot=RUBRIC.reduce((a,r)=>a+res.scores[r[0]],0);
  return `${err?`<div class="notice warn" style="margin-bottom:10px">${err}</div>`:''}<div class="card pad">
  <div class="row between"><b>Kết quả: ${tot}/15</b><span class="pill"><span class="dot ${src==='ai'?'on':'off'}"></span>${src==='ai'?'Nhận xét của AI – có thể sai, hãy cân nhắc':'Chấm cục bộ theo dấu hiệu ngôn ngữ – chỉ để tham khảo'}</span></div>
  <table class="rub" style="margin-top:8px"><thead><tr><th>Tiêu chí</th><th>Mức</th><th>Nhận xét</th></tr></thead><tbody>
  ${RUBRIC.map(r=>`<tr><td>${r[1]}</td><td><span class="lvl" aria-label="Mức ${res.scores[r[0]]}/3">${[1,2,3].map(k=>`<i class="${k<=res.scores[r[0]]?'f':''}"></i>`).join('')}</span><div class="tiny muted">${esc(r[1+res.scores[r[0]]])}</div></td><td>${esc((res.comments||{})[r[0]]||'')}</td></tr>`).join('')}
  </tbody></table>
  ${res.next?`<p style="margin:10px 0 4px"><b>Việc nên làm tiếp:</b> ${esc(res.next)}</p>`:''}
  ${res.question?`<p style="margin:4px 0"><b>Câu hỏi Socrates:</b> ${esc(res.question)}</p>`:''}
  <p class="tiny muted" style="margin:8px 0 0">Kết quả đã ghi vào <a href="#dashboard">bản đồ kỹ năng</a>.</p></div>`;
}

/* ---------- THINKING LAB ---------- */
let pendingLab=null, LAB=null, labAbort=null;
function newSession(mode, level){ return {id:'s'+Date.now(), mode, level:level||S.get('profile',{}).level||2, step:0, msgs:[], t:Date.now(), docId:null, selfFirst:true}; }
function saveSession(){ if(!LAB||!LAB.msgs.length) return; const a=S.get('sessions',[]).filter(s=>s.id!==LAB.id); a.unshift(LAB); S.set('sessions',a.slice(0,40)); }
function pageLab(){
  setTitle('AI Labs');
  if(pendingLab){ LAB=newSession(pendingLab.mode); LAB.docId=pendingLab.docId; LAB.question=pendingLab.question||''; }
  else if(!LAB){ const last=S.get('sessions',[])[0]; LAB = last && Date.now()-last.t<36e5*6 ? last : newSession('debate'); }
  const pl=pendingLab; pendingLab=null;
  const doc=LAB.docId?BY[LAB.docId]:null;
  $('#view').innerHTML=`<section class="section wrap" style="max-width:960px">
    <div class="pageHero" style="--hero:url(img/cover_pb.jpg);margin-top:0"><div class="in labHead"><div><div class="kicker">AI Labs</div><h1 style="margin:0;color:var(--brand)">Phòng thí nghiệm tư duy</h1></div><div class="row">${aiPill()}</div></div></div>
    <div class="row" style="margin-top:14px"><div class="seg" role="tablist" aria-label="Chế độ" id="modes">${Object.entries(MODES).map(([k,m])=>`<button role="tab" aria-selected="${LAB.mode===k}" class="${LAB.mode===k?'on':''}" data-m="${k}">${m.n}</button>`).join('')}</div></div>
    <div class="row between" style="margin-top:10px">
      <div class="seg" role="radiogroup" aria-label="Cấp độ" id="lvls">${Object.entries(LEVELS).map(([k,v])=>`<button role="radio" aria-checked="${LAB.level==k}" class="${LAB.level==k?'on':''}" data-l="${k}">${v}</button>`).join('')}</div>
      <div class="row"><button class="btn sm" id="lNew">+ Phiên mới</button><button class="btn sm" id="lSum">Tổng kết & chấm</button><button class="btn sm" id="lExp">Xuất phiên</button></div>
    </div>
    <div id="labBody"></div>
  </section>`;
  $('#modes').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; saveSession(); LAB=newSession(b.dataset.m, LAB.level); pageLab(); };
  $('#lvls').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; LAB.level=+b.dataset.l; $$('#lvls button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b);}); };
  $('#lNew').onclick=()=>{ saveSession(); LAB=newSession(LAB.mode, LAB.level); pageLab(); };
  $('#lExp').onclick=()=>exportSession(LAB);
  $('#lSum').onclick=()=>summarize();
  if(LAB.mode==='annotate'){ labAnnotate(); if(pl&&pl.text){ $('#annIn').value=pl.text; $('#annGo').click(); } return; }
  if(LAB.mode==='grade'){ labGrade(); if(pl&&pl.text){ $('#gIn').value=pl.text; $('#gIn').dispatchEvent(new Event('input')); } return; }
  const steps=STEPS[LAB.mode];
  $('#labBody').innerHTML=`
    <div class="steps" aria-label="Tiến trình">${steps.map((s,i)=>`<span class="${i<LAB.step?'done':i===LAB.step?'on':''}">${i+1}. ${s}</span>`).join('')}</div>
    ${doc?`<div class="notice small">Đang gắn với bài đọc: <a href="#doc-${doc.i}">${esc(doc.t)}</a>${LAB.question?` · Câu hỏi: <i>${esc(LAB.question)}</i>`:''}</div>`:''}
    <div class="chat" id="chat" aria-live="polite"></div>
    <div class="composer">
      <div id="labErr" role="alert"></div>
      <label class="sr" for="inp">Nội dung gửi</label>
      <textarea id="inp" placeholder="${esc(MODES[LAB.mode].ph)}"></textarea>
      <div class="row between" style="margin-top:8px">
        <label class="small row" style="gap:6px" ${LAB.mode!=='debate'?'hidden':''}><input type="checkbox" id="self" ${LAB.selfFirst?'checked':''}> Tự viết trước (≥ 3 câu ở lượt đầu)</label>
        <span class="small muted" id="cnt"></span>
        <button class="btn pri" id="send">Gửi</button>
      </div>
      <p class="tiny muted" style="margin:6px 0 0">AI có thể sai – hãy kiểm chứng với văn bản và nguồn tin cậy. Mỗi câu trả lời có nút “Báo chưa đúng”.</p>
    </div>`;
  drawChat();
  const inp=$('#inp');
  if(pl && pl.question) inp.value='Câu hỏi: '+pl.question+'\nÝ kiến của em: ';
  if(pl && pl.text) inp.value=pl.text;
  const draft=S.get('draft',''); if(!inp.value && draft) inp.value=draft;
  const cnt=()=>$('#cnt').textContent=`${wc(inp.value)} chữ · ${sentences(inp.value).length} câu`;
  inp.addEventListener('input',()=>{cnt(); S.set('draft',inp.value);}); cnt();
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){ e.preventDefault(); send(); } });
  $('#send').onclick=send;
  const sf=$('#self'); if(sf) sf.onchange=()=>LAB.selfFirst=sf.checked;
}
function drawChat(){
  const c=$('#chat'); if(!c) return;
  if(!LAB.msgs.length){ c.innerHTML=`<div class="card pad"><h3>${MODES[LAB.mode].n}</h3><p class="small">${MODES[LAB.mode].intro}</p>
    <div class="small muted">Gợi ý để bắt đầu:</div><div class="row" style="margin-top:6px">${starter(LAB.mode).map(s=>`<button class="btn sm" data-st="${esc(s)}">${esc(s.length>70?s.slice(0,68)+'…':s)}</button>`).join('')}</div></div>`;
    $$('[data-st]',c).forEach(b=>b.onclick=()=>{ $('#inp').value=b.dataset.st; $('#inp').focus(); $('#inp').dispatchEvent(new Event('input')); }); return; }
  c.innerHTML=LAB.msgs.map((m,i)=>m.r==='u'?`<div class="msg u">${esc(m.t)}</div>`:`<div class="msg a">${md(m.t)}<div class="foot"><span>${m.local?'Chế độ cục bộ (phân tích theo quy tắc, không phải AI)':'Claude · AI có thể sai'}</span><button data-flag="${i}">Báo chưa đúng</button><button data-note="${i}">Lưu vào sổ tay</button></div></div>`).join('');
  $$('[data-flag]',c).forEach(b=>b.onclick=()=>flagAnswer(+b.dataset.flag));
  $$('[data-note]',c).forEach(b=>b.onclick=()=>{ S.push('labNotes',{t:Date.now(),q:LAB.msgs[+b.dataset.note-1]?.t||'',a:LAB.msgs[+b.dataset.note].t,mode:LAB.mode}); toast('Đã lưu vào Sổ tay'); });
}
function starter(m){
  return {debate:['Học sinh dùng AI để hỗ trợ viết bài luận luôn luôn làm giảm khả năng tư duy độc lập.','Em cho rằng Mị chạy theo A Phủ chỉ vì bản năng sống, không phải vì ý thức.','Văn học không có ích gì cho học sinh muốn theo khối tự nhiên.'],
    concept:['Tình huống truyện là sự việc chính của câu chuyện.','Ngụy biện là khi ai đó nói sai sự thật.','Hàm ngôn là những gì người nói muốn giấu.'],
    read:['Em thấy câu hỏi ở đầu bài Đây thôn Vĩ Dạ vừa như lời trách vừa như lời mời.','Trong Hai đứa trẻ, em chú ý chi tiết chuyến tàu đêm nhưng chưa hiểu vì sao nó quan trọng.','Bài Câu cá mùa thu: em không hiểu vì sao nói câu cá mà không thấy cá.']}[m]||[];
}
function flagAnswer(i){
  openModal(`<h3>Báo câu trả lời chưa đúng</h3><p class="small">Ghi lại điểm sai để bạn và giáo viên xem lại. Báo cáo được lưu trong Sổ tay (mục “Đã báo lỗi”), có thể xuất ra file để gửi giáo viên.</p>
  <textarea id="flagTxt" placeholder="Sai ở đâu? Ví dụ: chi tiết này không có trong tác phẩm…"></textarea>
  <div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn" data-close>Hủy</button><button class="btn pri" id="flagOk">Lưu báo cáo</button></div>`);
  $('#flagOk').onclick=()=>{ S.push('flags',{t:Date.now(),why:$('#flagTxt').value,a:LAB.msgs[i].t,q:LAB.msgs[i-1]?.t||'',local:!!LAB.msgs[i].local}); closeModal(); toast('Đã lưu báo cáo vào Sổ tay'); };
}
async function send(){
  const inp=$('#inp'), err=$('#labErr'); const t=inp.value.trim(); err.innerHTML='';
  if(!t){ err.innerHTML='<div class="notice warn">Hãy viết nội dung trước khi gửi.</div>'; return; }
  const firstUser=!LAB.msgs.some(m=>m.r==='u');
  if(LAB.mode==='debate'&&LAB.selfFirst&&firstUser&&sentences(t).length<3){ err.innerHTML='<div class="notice warn">“Tự viết trước”: lượt đầu cần ít nhất 3 câu (luận điểm, lí do, dẫn chứng). Bạn đang có '+sentences(t).length+' câu. Có thể tắt tùy chọn này bên dưới.</div>'; return; }
  LAB.msgs.push({r:'u',t}); inp.value=''; S.set('draft',''); $('#cnt').textContent='';
  if(firstUser) logAct('Bắt đầu phiên Lab: '+MODES[LAB.mode].n,'#lab');
  drawChat();
  const holder=document.createElement('div'); holder.className='msg a'; holder.innerHTML='<span class="typing"><i></i><i></i><i></i></span>'; $('#chat').appendChild(holder); holder.scrollIntoView({block:'nearest'});
  $('#send').disabled=true;
  let text='', local=false;
  if(sample){
    try{ labAbort=new AbortController(); text=await askAI(labPrompt(LAB), tx=>{ holder.innerHTML=md(tx||''); }, labAbort.signal); }
    catch(e){ err.innerHTML=`<div class="notice err">${aiErrText(e)} <button class="btn sm" id="retryAI">Thử lại với AI</button></div>`; text=''; }
  } else if(aiState==='checking'){ await new Promise(r=>setTimeout(r,1200)); }
  if(!text){ text=localReply(t, LAB.mode, LAB.step); local=true; }
  LAB.msgs.push({r:'a',t:text,local});
  LAB.step=Math.min(4,LAB.step+1); LAB.t=Date.now(); saveSession();
  $('#send').disabled=false;
  $$('.steps span').forEach((s,i)=>{ s.className=i<LAB.step?'done':i===LAB.step?'on':''; });
  drawChat(); $('#chat').lastElementChild.scrollIntoView({block:'nearest',behavior:'smooth'});
  const r=$('#retryAI'); if(r) r.onclick=()=>{ LAB.msgs.splice(-2,2); $('#inp').value=t; LAB.step=Math.max(0,LAB.step-1); err.innerHTML=''; drawChat(); send(); };
}
async function summarize(){
  const mine=LAB.msgs.filter(m=>m.r==='u').map(m=>m.t);
  if(LAB.mode==='annotate'||LAB.mode==='grade'){ toast('Chế độ này đã có kết quả ngay trên trang.'); return; }
  if(!mine.length){ toast('Phiên chưa có nội dung để tổng kết.'); return; }
  openModal(`<h3>Tổng kết phiên</h3><p class="small">Viết lại lập luận cuối cùng của bạn (3–6 câu), sau khi đã cân nhắc các câu hỏi trong phiên. Mạch Ngôn sẽ chấm theo 5 tiêu chí và so với lượt đầu.</p>
    <textarea id="finalTxt">${esc(mine[mine.length-1])}</textarea><div id="finalOut" style="margin-top:10px"></div>
    <div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn" data-close>Đóng</button><button class="btn pri" id="finalGo">Chấm lập luận cuối</button></div>`);
  $('#finalGo').onclick=async()=>{ const txt=$('#finalTxt').value; await gradeInto(txt, 'Phiên AI Labs, lập trường ban đầu: '+mine[0], $('#finalOut'), LAB.docId);
    const a=localScores(mine[0]).scores, b=localScores(txt).scores; const better=RUBRIC.filter(r=>b[r[0]]>a[r[0]]).map(r=>r[1]);
    LAB.final=txt; saveSession();
    $('#finalOut').insertAdjacentHTML('beforeend',`<div class="notice ok" style="margin-top:10px">So với lượt đầu (đo cục bộ): ${better.length?'tiến bộ ở <b>'+better.join(', ')+'</b>.':'chưa thấy thay đổi rõ trên các dấu hiệu ngôn ngữ; thử thêm dẫn chứng hoặc phản đề.'}</div>`); };
}
function sessionMD(s){
  return `# Phiên AI Labs – ${MODES[s.mode].n}\nNgày: ${fmtDate(s.t)} · Cấp độ: ${LEVELS[s.level]}${s.docId&&BY[s.docId]?` · Bài đọc: ${BY[s.docId].t}`:''}\n\n`+
    s.msgs.map((m,i)=>`## ${m.r==='u'?'Học sinh (lượt '+(Math.floor(i/2)+1)+')':'Trợ lý'+(m.local?' (cục bộ)':' (AI)')}\n${m.t}\n`).join('\n')+(s.final?`\n## Lập luận cuối cùng\n${s.final}\n`:'');
}
let downloads=null;
async function exportText(name, text){
  try{ if(!downloads && window.claude) downloads=await window.claude.use('downloads'); }catch(e){}
  openModal(`<h3>Xuất dữ liệu</h3><p class="small">Sao chép nội dung dưới đây${downloads?' hoặc tải về dưới dạng tệp':''}.</p><textarea style="min-height:220px" readonly id="expTxt">${esc(text)}</textarea>
   <div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn" data-close>Đóng</button><button class="btn" id="expCopy">Sao chép</button>${downloads?'<button class="btn pri" id="expDl">Tải tệp</button>':''}</div>`);
  $('#expCopy').onclick=async()=>{ try{ await navigator.clipboard.writeText(text); toast('Đã sao chép'); }catch(e){ $('#expTxt').select(); toast('Hãy nhấn Ctrl+C để sao chép'); } };
  const dl=$('#expDl'); if(dl) dl.onclick=async()=>{ try{ await downloads.save({filename:name,data:text}); toast('Đã gửi yêu cầu tải tệp'); }catch(e){ toast('Không tải được tệp: '+((e&&e.message)||'bị từ chối')); } };
}
function exportSession(s){ if(!s.msgs.length){ toast('Phiên chưa có nội dung.'); return; } exportText(`mach-ngon-phien-${today()}.md`, sessionMD(s)); }

function labAnnotate(){
  $('#labBody').innerHTML=`<div class="card pad" style="margin-top:14px"><p class="small">${MODES.annotate.intro}</p>
   <textarea id="annIn" placeholder="${esc(MODES.annotate.ph)}">${esc(S.get('annDraft',''))}</textarea>
   <div class="row" style="margin-top:8px"><button class="btn pri" id="annGo">Tách câu để tô</button><button class="btn sm" id="annSample">Dùng đoạn mẫu</button></div></div>
   <div id="annArea" style="margin-top:14px"></div>`;
  $('#annIn').addEventListener('input',e=>S.set('annDraft',e.target.value));
  $('#annSample').onclick=()=>{ $('#annIn').value='Học sinh nên được dùng AI trong học tập. Theo khảo sát của lớp 11A6, 70% học sinh dùng AI để tra cứu khái niệm khó. Bởi vì phản hồi nhanh giúp người học tự sửa lỗi kịp thời. Tuy nhiên, có ý kiến cho rằng AI khiến học sinh lười suy nghĩ. Điều này có thể đúng nếu học sinh chép nguyên câu trả lời mà không tự viết trước.'; };
  $('#annGo').onclick=()=>{ const t=$('#annIn').value.trim(); if(sentences(t).length<2){ $('#annArea').innerHTML='<div class="notice warn">Cần ít nhất 2 câu.</div>'; return; }
    $('#annArea').innerHTML=`<div class="card pad annot"><div class="legend">${ROLES.map(r=>`<span><i style="background:var(${r[2]})"></i>${r[1]}</span>`).join('')}</div>
     <p style="font-family:var(--read);font-size:18px;line-height:1.9;margin:12px 0" id="annTxt">${sentSpans(t)}</p>
     <div class="row"><button class="btn pri sm" id="annCmp">So với gợi ý</button><span class="small muted" id="annR">Nhấn vào từng câu để đổi vai trò.</span></div></div>`;
    bindSents($('#annTxt')); $('#annCmp').onclick=()=>compareRoles($$('#annTxt .sent'),$('#annR')); };
}
function labGrade(){
  $('#labBody').innerHTML=`<div class="card pad" style="margin-top:14px"><p class="small">${MODES.grade.intro}</p>
   <label class="f" for="gTopic">Đề bài (không bắt buộc)</label><input id="gTopic" type="text" placeholder="VD: Suy nghĩ về sự tử tế trong đời sống hôm nay">
   <label class="f" for="gIn" style="margin-top:10px">Bài viết của bạn</label><textarea id="gIn" style="min-height:200px" placeholder="${esc(MODES.grade.ph)}">${esc(S.get('gradeDraft',''))}</textarea>
   <div class="row between" style="margin-top:8px"><span class="small muted" id="gCnt"></span><button class="btn pri" id="gGo">Chấm theo tiêu chí</button></div></div>
   <div id="gOut" style="margin-top:14px" aria-live="polite"></div>
   <div class="card pad" style="margin-top:14px"><h3>Bảng tiêu chí</h3><table class="rub"><thead><tr><th>Tiêu chí</th><th>Mức 1 – Bắt đầu</th><th>Mức 2 – Đạt</th><th>Mức 3 – Tốt</th></tr></thead><tbody>${RUBRIC.map(r=>`<tr><td><b>${r[1]}</b></td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</tbody></table></div>`;
  const g=$('#gIn'); const c=()=>$('#gCnt').textContent=`${wc(g.value)} chữ · ${sentences(g.value).length} câu`; c();
  g.addEventListener('input',()=>{c();S.set('gradeDraft',g.value);});
  $('#gGo').onclick=()=>gradeInto(g.value,$('#gTopic').value,$('#gOut'),null);
}

/* ---------- HÀNH TRÌNH ---------- */
function pagePaths(){
  setTitle('Hành trình tri thức');
  const act=S.get('activeJourney','');
  $('#view').innerHTML=`<section class="section wrap"><div class="kicker">Hành trình tri thức</div><h1>${JOURNEYS.length} lộ trình đọc có thứ tự</h1>
  <p class="muted">Chọn một hành trình làm “đang theo”. Bài tiếp theo sẽ được gợi ý ở Tổng quan và cuối mỗi bài đọc.</p>
  <div class="grid g2">${JOURNEYS.map(j=>{ const done=j.ids.filter(isRead).length; const mins=j.ids.reduce((a,i)=>a+BY[i].min,0);
    return `<div class="card jcard"><div class="row between"><h3 style="margin:0">${esc(j.t)}</h3>${act===j.id?'<span class="chip b">Đang theo</span>':''}</div>
    <p class="small muted">${esc(j.d)}</p><div class="small">${j.ids.length} bài · khoảng ${mins} phút · đã xong ${done}/${j.ids.length}</div>
    <div class="pbar" style="margin:8px 0"><i style="width:${done/j.ids.length*100}%"></i></div>
    <ol class="jlist">${j.ids.map(i=>`<li class="${isRead(i)?'done':''}"><a href="#doc-${i}">${esc(BY[i].t)}</a></li>`).join('')}</ol>
    <div class="row" style="margin-top:10px"><a class="btn sm pri" href="#doc-${j.ids.find(i=>!isRead(i))||j.ids[0]}">${done?'Đọc tiếp':'Bắt đầu'}</a><button class="btn sm" data-j="${j.id}">${act===j.id?'Bỏ theo':'Theo hành trình này'}</button></div></div>`;}).join('')}</div></section>`;
  $$('[data-j]').forEach(b=>b.onclick=()=>{ S.set('activeJourney', S.get('activeJourney')===b.dataset.j?'':b.dataset.j); pagePaths(); });
}

/* ---------- THUẬT NGỮ ---------- */
function pageGlossary(){
  setTitle('Thuật ngữ');
  const groups={}; TERMS.forEach(t=>{ const k=norm(t)[0].toUpperCase(); (groups[k]=groups[k]||[]).push(t); });
  $('#view').innerHTML=`<section class="section wrap"><div class="kicker">Sổ từ vựng tư duy</div><h1>${TERMS.length} thuật ngữ</h1>
   <div class="grid g2" style="align-items:start">
    <div><input type="search" id="gq" placeholder="Tìm thuật ngữ…" aria-label="Tìm thuật ngữ"><div class="alpha" style="margin:12px 0">${Object.keys(groups).sort().map(k=>`<a href="javascript:void 0" data-k="${k}">${k}</a>`).join('')}</div><dl class="gl" id="gll"></dl></div>
    <div class="card pad" style="position:sticky;top:80px"><h3>Thẻ ghi nhớ</h3><p class="small muted">Nhấn vào thẻ để lật. Viết định nghĩa bằng lời của bạn trước khi lật.</p>
      <div class="card flash" id="flash" tabindex="0" role="button" aria-label="Lật thẻ"></div>
      <textarea id="myDef" placeholder="Định nghĩa bằng lời của bạn…" style="margin-top:10px;min-height:80px"></textarea>
      <div class="row" style="margin-top:8px"><button class="btn sm" id="fSave">Lưu định nghĩa của tôi</button><button class="btn sm pri" id="fNext">Thẻ khác</button></div></div>
   </div></section>`;
  const draw=q=>{ const n=norm(q); const my=S.get('myDefs',{});
    $('#gll').innerHTML=TERMS.filter(t=>!n||norm(t).includes(n)||norm(GL[t]||'').includes(n)).map(t=>`<dt id="t-${norm(t).replace(/\W+/g,'-')}">${esc(t)}</dt><dd>${GL[t]?esc(GL[t]):'<span class="muted">Xem cách dùng trong bài.</span>'}${my[t]?`<div class="small" style="margin-top:4px">✍️ <i>${esc(my[t])}</i></div>`:''}<div class="tiny">Trong: ${docsWithTerm(t).map(y=>`<a href="#doc-${y.i}">${esc(y.t.split(':')[0])}</a>`).join(', ')}</div></dd>`).join('')||'<p class="muted">Không tìm thấy.</p>'; };
  draw(''); $('#gq').oninput=e=>draw(e.target.value);
  $$('.alpha a').forEach(a=>a.onclick=()=>{ const t=groups[a.dataset.k][0]; const el=document.getElementById('t-'+norm(t).replace(/\W+/g,'-')); if(el) el.scrollIntoView({behavior:'smooth'}); });
  const defs=Object.keys(GL); let cur, flipped;
  const next=()=>{ cur=defs[Math.floor(Math.random()*defs.length)]; flipped=false; $('#flash').innerHTML=`<div><div class="kicker">Thuật ngữ</div><h2 style="margin:0">${esc(cur)}</h2></div>`; $('#myDef').value=S.get('myDefs',{})[cur]||''; };
  const flip=()=>{ flipped=!flipped; $('#flash').innerHTML=flipped?`<div><div class="kicker">${esc(cur)}</div><p>${esc(GL[cur])}</p></div>`:`<div><div class="kicker">Thuật ngữ</div><h2 style="margin:0">${esc(cur)}</h2></div>`; };
  next(); $('#flash').onclick=flip; $('#flash').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip();}};
  $('#fNext').onclick=next; $('#fSave').onclick=()=>{ const m=S.get('myDefs',{}); m[cur]=$('#myDef').value; if(!m[cur]) delete m[cur]; S.set('myDefs',m); toast('Đã lưu vào sổ từ vựng'); draw($('#gq').value); };
}

/* ---------- TỔNG QUAN ---------- */
function skillStats(){
  const sc=S.get('scores',[]); const recent=sc.slice(0,5), prev=sc.slice(5,10);
  const avg=(arr,k)=>arr.length?arr.reduce((a,x)=>a+x.s[k],0)/arr.length:null;
  return RUBRIC.map(r=>({k:r[0],n:r[1],now:avg(recent,r[0]),before:avg(prev,r[0])}));
}
function pageDashboard(){
  setTitle('Tổng quan');
  const read=S.get('read',[]), saved=S.get('saved',[]), notes=Object.keys(S.get('notes',{})).length, pos=Object.keys(S.get('pos',{})).length;
  const sessions=S.get('sessions',[]).length, scores=S.get('scores',[]);
  const reading=S.get('opened',[]).filter(i=>!read.includes(i)&&BY[i]);
  const j=JOURNEYS.find(x=>x.id===S.get('activeJourney'));
  const prof=S.get('profile',null);
  const interests=prof?.interests?.length?prof.interests:Object.keys(FIELDS);
  const nextJ=j?j.ids.find(i=>!read.includes(i)):null;
  const rec=LIB.filter(x=>!read.includes(x.i)&&!saved.includes(x.i)&&x.i!==nextJ&&interests.includes(x.f)&&(!prof||Math.abs(x.l-(prof.level||2))<=1)).slice(0,3);
  const sk=skillStats();
  $('#view').innerHTML=`<section class="section wrap"><div class="kicker">Tổng quan</div><h1>Góc học tập của bạn</h1>
  ${prof?'':'<div class="notice" style="margin-bottom:14px">Chưa có hồ sơ học tập. <a href="#start">Làm khảo sát 2 phút</a> để nhận lộ trình phù hợp.</div>'}
  <div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
    <div class="card stat"><b>${read.length}/${LIB.length}</b>bài đã đọc xong</div>
    <div class="card stat"><b>${reading.length}</b>bài đang đọc</div>
    <div class="card stat"><b>${saved.length}</b>bài đã lưu</div>
    <div class="card stat"><b>${notes+pos}</b>ghi chú & lập trường</div>
    <div class="card stat"><b>${sessions}</b>phiên Lab</div>
    <div class="card stat"><b>${scores.length}</b>lần chấm lập luận</div>
  </div>
  <div class="grid g2" style="margin-top:18px;align-items:start">
    <div class="card pad"><h3>Bản đồ kỹ năng</h3>
     ${scores.length?`<p class="small muted">Trung bình 5 lần chấm gần nhất (thang 3)${scores.length>5?', so với 5 lần trước đó':''}.</p><div class="bars">${sk.map(s=>`<div class="b"><span>${s.n}</span><span class="t"><i style="width:${(s.now/3)*100}%"></i></span><span class="small">${s.now.toFixed(1)}${s.before!=null?` <span class="${s.now>s.before?'':'muted'}">${s.now>s.before?'▲':s.now<s.before?'▼':'='}</span>`:''}</span></div>`).join('')}</div>
     <p class="small">Kỹ năng cần ưu tiên: <b>${sk.slice().sort((a,b)=>a.now-b.now)[0].n}</b>.</p>`:'<p class="small muted">Chưa có dữ liệu. Hãy viết lập trường ở cuối một bài đọc hoặc dùng chế độ “Chấm theo tiêu chí” trong Lab.</p><a class="btn sm pri" href="#lab">Mở Lab</a>'}
    </div>
    <div class="card pad"><h3>Học tiếp</h3>
     ${j?`<p class="small">Hành trình đang theo: <b>${esc(j.t)}</b> (${j.ids.filter(i=>read.includes(i)).length}/${j.ids.length})</p>${nextJ?`<a class="btn sm pri" href="#doc-${nextJ}">Bài tiếp: ${esc(BY[nextJ].t)}</a>`:'<p class="small">🎉 Bạn đã hoàn thành hành trình này.</p>'}`:'<p class="small">Chưa theo hành trình nào. <a href="#paths">Chọn hành trình</a>.</p>'}
     ${reading.length?`<p class="small" style="margin-top:12px"><b>Đang đọc dở:</b> ${reading.slice(0,3).map(i=>`<a href="#doc-${i}">${esc(BY[i].t)}</a>`).join(' · ')}</p>`:''}
     <h3 style="margin-top:16px">Gợi ý cho bạn</h3>${rec.length?rec.map(x=>`<div style="margin:6px 0"><a href="#doc-${x.i}">${esc(x.t)}</a> <span class="tiny muted">${esc(x.g)} · ${x.min} phút</span></div>`).join(''):'<p class="small muted">Bạn đã đọc hết các bài thuộc lĩnh vực quan tâm. Hãy mở rộng lĩnh vực trong khảo sát.</p>'}
    </div>
  </div>
  <div class="card pad" style="margin-top:18px"><h3>Hoạt động gần đây</h3>${S.get('log',[]).slice(0,8).map(l=>`<div class="small" style="margin:5px 0"><span class="muted">${fmtDate(l.t)}</span> · ${l.href?`<a href="${l.href}">${esc(l.text)}</a>`:esc(l.text)}</div>`).join('')||'<p class="small muted">Chưa có hoạt động.</p>'}</div>
  </section>`;
}

/* ---------- KHẢO SÁT ---------- */
function pageStart(){
  setTitle('Khảo sát học tập');
  const p=S.get('profile',{level:2,goal:'',interests:[]});
  const QZ=[
    {q:'“Bạn Minh nộp bài muộn, chắc chắn bạn ấy lười.” Phần nào là giả định ngầm?',o:['Minh nộp bài muộn','Ai nộp muộn đều do lười','Minh là học sinh'],a:1},
    {q:'“Cả lớp ai cũng chép mạng nên chép là bình thường.” Đây là kiểu lập luận nào?',o:['Lợi dụng số đông (ngụy biện)','Lập luận nhân quả hợp lệ','Loại suy mạnh'],a:0},
    {q:'Mẹ nói “Trời mưa to lắm đấy” khi bạn định ra ngoài. Hàm ngôn có thể là:',o:['Thông báo thời tiết','Khuyên bạn cân nhắc việc ra ngoài','Hỏi bạn có thích mưa không'],a:1}];
  $('#view').innerHTML=`<section class="section wrap" style="max-width:760px"><div class="kicker">Khảo sát học tập · 2 phút</div><h1>Bạn muốn rèn điều gì?</h1>
  <form id="sf" class="card pad">
   <label class="f">1. Trình độ tự đánh giá</label><div class="seg" id="sLv">${Object.entries(LEVELS).map(([k,v])=>`<button type="button" data-l="${k}" class="${p.level==k?'on':''}">${v}</button>`).join('')}</div>
   <label class="f" style="margin-top:14px" for="sGoal">2. Mục tiêu chính</label>
   <select id="sGoal">${['Ôn đọc hiểu văn bản','Viết nghị luận văn học','Viết nghị luận xã hội','Bồi dưỡng học sinh giỏi Ngữ văn','Tranh biện, thuyết trình','Đọc vì tò mò, mở rộng hiểu biết'].map(g=>`<option ${p.goal===g?'selected':''}>${g}</option>`).join('')}</select>
   <label class="f" style="margin-top:14px">3. Lĩnh vực quan tâm (chọn nhiều)</label>
   <div class="fchips" id="sInt">${Object.entries(FIELDS).map(([k,f])=>`<button type="button" data-f="${k}" class="${(p.interests||[]).includes(k)?'on':''}">${f.ic} ${f.n}</button>`).join('')}</div>
   <label class="f" style="margin-top:6px">4. Kiểm tra nhanh 3 câu</label>
   ${QZ.map((q,i)=>`<div class="qbox"><b>${esc(q.q)}</b>${q.o.map((o,j)=>`<label class="row small" style="margin-top:6px"><input type="radio" name="q${i}" value="${j}"> ${esc(o)}</label>`).join('')}</div>`).join('')}
   <div class="row" style="justify-content:flex-end;margin-top:10px"><a class="btn" href="#home">Bỏ qua</a><button class="btn pri" type="submit">Nhận lộ trình</button></div>
  </form><div id="sRes" style="margin-top:16px" aria-live="polite"></div></section>`;
  let lv=p.level||2; const ints=new Set(p.interests||[]);
  $('#sLv').onclick=e=>{ const b=e.target.closest('button'); if(!b)return; lv=+b.dataset.l; $$('#sLv button').forEach(x=>x.classList.toggle('on',x===b)); };
  $('#sInt').onclick=e=>{ const b=e.target.closest('button'); if(!b)return; const f=b.dataset.f; ints.has(f)?ints.delete(f):ints.add(f); b.classList.toggle('on'); };
  $('#sf').onsubmit=e=>{ e.preventDefault(); const sc=QZ.reduce((a,q,i)=>a+(+((document.querySelector(`[name=q${i}]:checked`)||{}).value)===q.a?1:0),0);
    const goal=$('#sGoal').value; const map={'Ôn đọc hiểu văn bản':'truyen','Viết nghị luận văn học':'tho','Viết nghị luận xã hội':'nlxh','Bồi dưỡng học sinh giỏi Ngữ văn':'hsgqg','Tranh biện, thuyết trình':'tdpb','Đọc vì tò mò, mở rộng hiểu biết':'ngonngu'};
    let jid=map[goal]; if(sc<=1 && (jid==='hsgqg'||jid==='hsg'||jid==='nlxh')) jid='tdpb';
    S.set('profile',{level:lv,goal,interests:[...ints],quiz:sc,t:Date.now()}); S.set('activeJourney',jid); const j=JOURNEYS.find(x=>x.id===jid);
    $('#sRes').innerHTML=`<div class="card pad"><h3>Kết quả: ${sc}/3 câu kiểm tra</h3><p>${sc===3?'Bạn đã nắm các khái niệm nền tảng.':sc===2?'Nền tảng khá tốt, còn một khái niệm cần ôn.':'Nên bắt đầu từ nhóm bài tư duy phản biện cơ bản.'}</p>
     <p>Lộ trình đề xuất: <b>${esc(j.t)}</b>. ${esc(j.d)}</p><div class="row"><a class="btn pri" href="#doc-${j.ids[0]}">Bắt đầu bài 1</a><a class="btn" href="#dashboard">Về Tổng quan</a></div></div>`;
    $('#sRes').scrollIntoView({behavior:'smooth'}); };
}

/* ---------- SỔ TAY ---------- */
function pageNotebook(){
  setTitle('Sổ tay');
  const saved=S.get('saved',[]).filter(i=>BY[i]), notes=S.get('notes',{}), pos=S.get('pos',{}), ses=S.get('sessions',[]), flags=S.get('flags',[]), ln=S.get('labNotes',[]);
  $('#view').innerHTML=`<section class="section wrap"><div class="kicker">Sổ tay</div><h1>Sổ tay của bạn</h1>
  <div class="notice warn" style="margin-bottom:16px">Dữ liệu chỉ lưu trên trình duyệt này: đổi máy hoặc xóa dữ liệu trình duyệt sẽ mất. Hãy <b>Xuất dữ liệu</b> định kỳ.
   <div class="row" style="margin-top:8px"><button class="btn sm" id="nbExp">Xuất toàn bộ dữ liệu</button><button class="btn sm" id="nbImp">Nhập dữ liệu đã xuất</button><button class="btn sm" id="nbDel">Xóa toàn bộ dữ liệu</button></div></div>
  <div class="grid g2" style="align-items:start">
   <div class="card pad"><h3>Bài đã lưu (${saved.length})</h3>${saved.map(i=>`<div style="margin:6px 0"><a href="#doc-${i}">${esc(BY[i].t)}</a></div>`).join('')||'<p class="small muted">Chưa lưu bài nào.</p>'}</div>
   <div class="card pad"><h3>Ghi chú & lập trường (${Object.keys(notes).length+Object.keys(pos).length})</h3>
    ${[...new Set([...Object.keys(pos),...Object.keys(notes)])].filter(i=>BY[i]).map(i=>`<div style="margin:10px 0"><a href="#doc-${i}"><b>${esc(BY[i].t)}</b></a>${pos[i]?`<div class="small">✍️ ${esc(pos[i])}</div>`:''}${notes[i]?`<div class="small muted">📝 ${esc(notes[i])}</div>`:''}</div>`).join('')||'<p class="small muted">Chưa có.</p>'}</div>
   <div class="card pad"><h3>Lịch sử phiên Lab (${ses.length})</h3>
    <input type="search" id="sesQ" placeholder="Tìm trong các phiên…" aria-label="Tìm phiên"><div id="sesL" style="margin-top:8px"></div></div>
   <div class="card pad"><h3>Trích đoạn Lab đã lưu (${ln.length})</h3>${ln.slice(0,10).map(n=>`<div class="small" style="margin:8px 0;border-top:1px dashed var(--line);padding-top:6px"><div class="muted">${fmtDate(n.t)} · ${MODES[n.mode]?.n||''}</div>${n.q?`<div><b>Bạn:</b> ${esc(n.q.slice(0,160))}</div>`:''}<div>${md(n.a)}</div></div>`).join('')||'<p class="small muted">Chưa có.</p>'}</div>
   <div class="card pad"><h3>Câu trả lời đã báo lỗi (${flags.length})</h3>${flags.map(f=>`<div class="small" style="margin:8px 0"><span class="muted">${fmtDate(f.t)}</span> · <b>Lí do:</b> ${esc(f.why||'(không ghi)')}<div class="muted">${esc(f.a.slice(0,180))}…</div></div>`).join('')||'<p class="small muted">Chưa có.</p>'}</div>
  </div></section>`;
  const drawS=q=>{ const n=norm(q); $('#sesL').innerHTML=ses.filter(s=>!n||norm(s.msgs.map(m=>m.t).join(' ')).includes(n)).map((s,i)=>`<div style="margin:8px 0;border-top:1px dashed var(--line);padding-top:6px" class="small"><b>${MODES[s.mode].n}</b> · ${fmtDate(s.t)} · ${s.msgs.filter(m=>m.r==='u').length} lượt${s.docId&&BY[s.docId]?' · '+esc(BY[s.docId].t.split(':')[0]):''}<div class="muted">${esc((s.msgs[0]||{}).t?.slice(0,120)||'')}</div><div class="row" style="margin-top:4px"><button class="btn sm" data-open="${s.id}">Mở tiếp</button><button class="btn sm" data-exp="${s.id}">Xuất</button></div></div>`).join('')||'<p class="small muted">Chưa có phiên nào.</p>';
    $$('[data-open]').forEach(b=>b.onclick=()=>{ LAB=ses.find(s=>s.id===b.dataset.open); location.hash='#lab'; });
    $$('[data-exp]').forEach(b=>b.onclick=()=>exportSession(ses.find(s=>s.id===b.dataset.exp))); };
  drawS(''); $('#sesQ').oninput=e=>drawS(e.target.value);
  $('#nbExp').onclick=()=>exportText(`mach-ngon-du-lieu-${today()}.json`, JSON.stringify(mem,null,1));
  $('#nbImp').onclick=()=>{ openModal(`<h3>Nhập dữ liệu</h3><p class="small">Dán nội dung tệp JSON đã xuất trước đây. Dữ liệu hiện tại sẽ được thay thế.</p><textarea id="impT" style="min-height:160px"></textarea><div id="impE"></div><div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn" data-close>Hủy</button><button class="btn pri" id="impOk">Nhập</button></div>`);
    $('#impOk').onclick=()=>{ try{ const v=JSON.parse($('#impT').value); if(typeof v!=='object'||Array.isArray(v)) throw 0; mem=v; saveStore(); closeModal(); toast('Đã nhập dữ liệu'); pageNotebook(); }catch(e){ $('#impE').innerHTML='<div class="notice err" style="margin-top:8px">Nội dung không phải dữ liệu Mạch Ngôn hợp lệ.</div>'; } }; };
  $('#nbDel').onclick=()=>{ openModal(`<h3>Xóa toàn bộ dữ liệu?</h3><p>Thao tác này xóa tiến độ đọc, ghi chú, lập trường, phiên Lab, điểm kỹ năng và hồ sơ trên trình duyệt này. <b>Không thể hoàn tác.</b> Nên xuất dữ liệu trước.</p><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Hủy</button><button class="btn pri" id="delOk" style="background:var(--bad);border-color:var(--bad)">Xóa vĩnh viễn</button></div>`);
    $('#delOk').onclick=()=>{ mem={}; saveStore(); LAB=null; closeModal(); toast('Đã xóa toàn bộ dữ liệu'); pageNotebook(); }; };
}

/* ---------- HƯỚNG DẪN ---------- */
function pageGuide(){
  setTitle('Hướng dẫn');
  $('#view').innerHTML=`<section class="section wrap" style="max-width:860px"><div class="kicker">Phương pháp học</div><h1>Hướng dẫn sử dụng Mạch Ngôn</h1>
  <h2>1. Ba tầng nhận thức</h2>
  <div class="grid g3"><div class="card pad"><b>Sự kiện</b><p class="small">Điều kiểm chứng được: chi tiết trong văn bản, số liệu, sự việc.</p></div><div class="card pad"><b>Giả định ngầm</b><p class="small">Điều không nói ra nhưng phải đúng thì lập luận mới đứng.</p></div><div class="card pad"><b>Diễn giải / ý kiến</b><p class="small">Cách hiểu của bạn, cần dựa trên sự kiện và nêu rõ giả định.</p></div></div>
  <h2>2. Năm bước tranh biện trong AI Labs</h2>
  <ol>${STEPS.debate.map((s,i)=>`<li><b>${s}</b> – ${['viết lập trường ≥ 3 câu (luận điểm, lí do, dẫn chứng).','AI chỉ ra giả định ngầm hoặc chỗ thiếu bằng chứng; bạn bổ sung.','bạn đối diện phản ví dụ mạnh nhất.','bạn giữ, thu hẹp hoặc đổi lập trường và viết lại.','bấm “Tổng kết & chấm”: chấm theo 5 tiêu chí, so với lượt đầu.'][i]}</li>`).join('')}</ol>
  <p class="small muted">Chế độ “Làm rõ khái niệm” và “Đọc văn bản văn học” cũng có 5 bước, hiển thị ngay trên thanh tiến trình của Lab.</p>
  <h2>3. Một phiên mẫu có chú thích</h2>
  <div class="chat demo">
   <div class="msg u">Học sinh dùng AI để hỗ trợ viết bài luận luôn luôn làm giảm khả năng tư duy độc lập. Vì AI viết sẵn nên học sinh không cần nghĩ. Ví dụ bạn em chép nguyên bài.</div>
   <div class="notice small">▲ <b>Bước 1 – Nêu lập trường.</b> Có luận điểm, lí do, một dẫn chứng cá nhân.</div>
   <div class="msg a"><h4>Ghi nhận</h4><p>Bạn nêu lập trường rõ và có ví dụ cụ thể về việc “chép nguyên bài”.</p><h4>Điểm cần soi</h4><p>Từ “luôn luôn” biến nhận định thành tuyệt đối; một ví dụ cá nhân chưa đủ để khái quát (khái quát hóa vội vàng).</p><h4>Câu hỏi Socrates</h4><p>Có cách dùng AI nào khiến học sinh phải suy nghĩ nhiều hơn không?</p><h4>Gợi ý mẫu câu</h4><p>“Điều này đúng trong trường hợp…, trừ khi…”</p></div>
   <div class="notice small">▲ Chuyển sang <b>Bước 2 – Soi giả định & bằng chứng</b>. Bạn sửa lập luận, AI tiếp tục hỏi.</div>
  </div>
  <h2>4. Các nút chính</h2>
  <ul><li><b>Mở trong Lab</b> (trên thanh công cụ bài đọc) và <b>Trả lời trong Lab</b> (dưới mỗi câu hỏi tư duy): mang bài đọc/câu hỏi sang AI Labs.</li>
  <li><b>Nhờ AI phản biện & chấm</b> (khối “Viết lập trường của bạn”): chấm theo 5 tiêu chí, chỉ hoạt động khi bạn đã tự viết ≥ 3 câu.</li>
  <li><b>Soi lập luận</b>: tô vai trò từng câu theo Toulmin (luận điểm, căn cứ, lí lẽ – giả định, từ giới hạn, phản bác) rồi so với gợi ý.</li>
  <li><b>Báo chưa đúng</b>: ghi lại câu trả lời AI có vấn đề vào Sổ tay để báo giáo viên.</li></ul>
  <h2>5. Về AI và chế độ cục bộ</h2>
  <p>Khi chạy trên claude.ai, AI Labs dùng Claude (lần đầu sẽ hỏi quyền). Nếu AI không sẵn sàng, Mạch Ngôn tự chuyển sang <b>chế độ cục bộ</b>: phân tích theo quy tắc (từ tuyệt đối hóa, dấu hiệu dẫn chứng, phản đề, nhân vật/tác phẩm được nhắc tới) và luôn ghi rõ nhãn “Chế độ cục bộ”.</p>
  <h2>6. Phím tắt</h2>
  <p><kbd>/</kbd> tìm trong thư viện · <kbd>?</kbd> danh sách phím tắt · <kbd>Enter</kbd> gửi trong Lab · <kbd>Shift</kbd>+<kbd>Enter</kbd> xuống dòng · <kbd>Esc</kbd> đóng hộp thoại</p>
  </section>`;
}

/* ---------- GIỚI THIỆU ---------- */
function pageAbout(){
  setTitle('Giới thiệu');
  const cnt=Object.fromEntries(Object.keys(FIELDS).map(k=>[k,LIB.filter(x=>x.f===k).length]));
  $('#view').innerHTML=`<section class="section wrap" style="max-width:860px"><div class="kicker">Về dự án</div><h1>MẠCH NGÔN – Nền tảng AI hỗ trợ phát triển tư duy ngôn ngữ cho học sinh</h1>
  <p class="lead" style="font-family:var(--read)">Dự án dự thi “Học sinh với ý tưởng khởi nghiệp” năm học 2026–2027 (lĩnh vực LV04), Trường THPT Trần Phú, Bà Rịa – Vũng Tàu.</p>
  <h2>Mục tiêu</h2><p>Giúp học sinh THPT đọc sâu, lập luận có căn cứ và viết rõ ràng, đặc biệt trong môn Ngữ văn, bằng cách kết hợp học liệu chọn lọc với một trợ lý AI <b>đặt câu hỏi thay vì làm hộ</b>.</p>
  <h2>Đối tượng</h2><p>Học sinh lớp 10–12 (ôn đọc hiểu, nghị luận văn học, nghị luận xã hội, bồi dưỡng học sinh giỏi) và giáo viên Ngữ văn cần học liệu, câu hỏi tư duy và bảng tiêu chí chấm lập luận.</p>
  <h2>Nhóm thực hiện</h2>
  <ul><li><b>Giáo viên hướng dẫn:</b> Lê Thị Điệp – giáo viên Ngữ văn, THPT Trần Phú (thẩm định nội dung chuyên môn).</li>
  <li><b>Nhóm học sinh:</b> Trương Mai Lan, Xuân Lan – ý tưởng, thiết kế trải nghiệm, biên soạn học liệu.</li></ul>
  <h2>Học liệu</h2><p>${LIB.length} bài: ${Object.entries(FIELDS).map(([k,f])=>`${f.n} (${cnt[k]})`).join(', ')}. Mỗi bài có ít nhất 3 nguồn tham khảo (tác phẩm gốc, giáo trình, công trình nghiên cứu), thời lượng đọc tính tự động theo số chữ thực tế.</p>
  <h2>Quy trình biên soạn và kiểm duyệt</h2>
  <ol><li>Nhóm biên soạn bản nháp (có hỗ trợ AI) theo khung: tóm lược – ý chính – ví dụ – câu hỏi tư duy – bài tập – nguồn.</li>
  <li>Đối chiếu với tác phẩm gốc và nguồn tham khảo đã liệt kê.</li>
  <li>Giáo viên Ngữ văn thẩm định. Chỉ khi được duyệt, bài mới mang nhãn <span class="chip g">✓ Đã thẩm định</span> kèm tên người duyệt; trước đó bài ghi rõ <span class="chip w">Chờ thẩm định</span>.</li></ol>
  <h2>Chính sách dữ liệu và AI</h2>
  <ul><li>Không cần tài khoản để đọc và dùng Lab. Tiến độ, ghi chú, phiên Lab lưu <b>trên trình duyệt của bạn</b>; có nút xuất, nhập và xóa toàn bộ trong <a href="#notebook">Sổ tay</a>.</li>
  <li>Nội dung bạn gửi trong AI Labs chỉ được gửi tới AI khi bạn bấm Gửi hoặc nút chấm. Không nhập thông tin cá nhân nhạy cảm vào Lab.</li>
  <li>AI có thể sai. Phản hồi luôn ghi rõ nguồn (AI hay chế độ cục bộ), kèm nút “Báo chưa đúng”.</li>
  <li>Phiên bản này không có khu vực quản trị công khai.</li></ul>
  <h2>Chi phí</h2><p>Hướng tới mức phí rất thấp cho học sinh, chỉ khoảng bằng một ổ bánh mì mỗi tháng cho tính năng AI nâng cao; phần thư viện mở miễn phí.</p>
  <h2>Liên hệ</h2><p>Tổ Ngữ văn, Trường THPT Trần Phú, Bà Rịa – Vũng Tàu.</p>
  </section>`;
}
function page404(){ setTitle('Không tìm thấy'); $('#view').innerHTML=`<section class="section wrap"><h1>Không tìm thấy trang</h1><p>Trang hoặc bài đọc này không tồn tại.</p><a class="btn pri" href="#library">Về thư viện</a></section>`; }

/* ---------- modal, drawer, phím tắt, giao diện ---------- */
function openModal(html){ $('#modalBox').innerHTML=html; $('#modal').classList.add('open'); $$('[data-close]',$('#modalBox')).forEach(b=>b.onclick=closeModal); const f=$('#modalBox textarea, #modalBox input, #modalBox button'); if(f) f.focus(); }
function closeModal(){ $('#modal').classList.remove('open'); }
$('#modal').addEventListener('click',e=>{ if(e.target.id==='modal') closeModal(); });
function closeDrawer(){ $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden','true'); }
$('#menuBtn').onclick=()=>{ $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden','false'); };
$('#drawer').addEventListener('click',e=>{ if(e.target.id==='drawer'||e.target.closest('a')) closeDrawer(); });
$('#searchBtn').onclick=()=>{ if(!location.hash.startsWith('#library')) location.hash='#library'; setTimeout(()=>$('#lq')&&$('#lq').focus(),60); };
const SPACES=[['','Văn Hiến','#783e47','Thư viện cổ điển, giá sách gỗ sồi, ánh sáng kem ngà và sắc đỏ rượu vang.'],['tbt','Tân Biên Tập','#1e3a5f','Phòng biên tập tối giản, tường trắng, kệ sách xanh mực và khoảng trống tĩnh lặng.'],['tm','Tinh Mộng','#6d52b3','Thư phòng ban đêm dưới ngọn đèn bàn, tông tím than dịu mắt khi đọc khuya.'],['lb','Lục Bản','#23533a','Góc đọc bên cửa sổ vườn xanh, tông lục nhạt, thư thái như buổi sáng.']];
function curSpace(){ const t=S.get('theme',''); return SPACES.some(x=>x[0]===t)?t:''; }
function applyTheme(){ document.documentElement.dataset.theme=curSpace(); }
function setSpace(t){ S.set('theme',t); applyTheme(); const sp=SPACES.find(x=>x[0]===t); toast('Không gian đọc: '+sp[1]); $$('.spaces button').forEach(b=>b.classList.toggle('on',b.dataset.sp===t)); const d=$('.spaces .desc'); if(d) d.textContent=sp[3]; }
$('#themeBtn').onclick=()=>{ const i=SPACES.findIndex(x=>x[0]===curSpace()); setSpace(SPACES[(i+1)%SPACES.length][0]); };
function spacesBar(){ const c=curSpace(); return `<div class="spaces glass" role="radiogroup" aria-label="Không gian đọc"><span class="small muted">Không gian đọc:</span>${SPACES.map(x=>`<button role="radio" aria-checked="${x[0]===c}" class="${x[0]===c?'on':''}" data-sp="${x[0]}"><i style="background:${x[2]}"></i>${x[1]}</button>`).join('')}<span class="desc">${SPACES.find(x=>x[0]===c)[3]}</span></div>`; }
document.addEventListener('click',e=>{ const b=e.target.closest('.spaces button'); if(b) setSpace(b.dataset.sp); });
/* tra từ nhanh */
function lkDraw(q){ const n=norm(q).trim(); const list=(n?TERMS.filter(t=>norm(t).includes(n)||norm(GL[t]||'').includes(n)):TERMS.filter(t=>GL[t]).slice(0,6)).slice(0,12);
  $('#lkRes').innerHTML=list.map(t=>`<div><b>${esc(t)}</b><br>${GL[t]?esc(GL[t]):'<span class="muted">Xem trong bài.</span>'}<div class="tiny">${docsWithTerm(t).slice(0,2).map(y=>`<a href="#doc-${y.i}">${esc(y.t.split(':')[0])}</a>`).join(' · ')}</div></div>`).join('')||'<div class="muted">Không tìm thấy thuật ngữ.</div>'; }
function lkToggle(open){ const el=$('#lookup'); const o=open===undefined?!el.classList.contains('open'):open; el.classList.toggle('open',o); $('#fab').setAttribute('aria-expanded',o); if(o){ lkDraw($('#lkQ').value); $('#lkQ').focus(); } }
$('#fab').onclick=()=>lkToggle(); $('#lkClose').onclick=()=>lkToggle(false); $('#lkQ').oninput=e=>lkDraw(e.target.value);
$('#lkRes').addEventListener('click',e=>{ if(e.target.closest('a')) lkToggle(false); });
document.addEventListener('keydown',e=>{
  const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if(e.key==='Escape'){ closeModal(); closeDrawer(); hidePop(); lkToggle(false); }
  if(typing) return;
  if(e.key==='/'){ e.preventDefault(); $('#searchBtn').click(); }
  if(e.key==='?'){ openModal(`<h3>Phím tắt</h3><p><kbd>/</kbd> Tìm trong thư viện</p><p><kbd>?</kbd> Mở bảng này</p><p><kbd>Enter</kbd> Gửi trong AI Labs · <kbd>Shift</kbd>+<kbd>Enter</kbd> xuống dòng</p><p><kbd>Esc</kbd> Đóng hộp thoại, menu</p><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Đóng</button></div>`); }
});

/* ---------- khởi động ---------- */
applyTheme(); applyFs();
$('#view').innerHTML='<section class="section wrap"><p class="muted">Đang tải thư viện…</p></section>';
initAI();
loadData().then(()=>{ addEventListener('hashchange',route); route(); }).catch(e=>{ $('#view').innerHTML=`<section class="section wrap"><div class="notice err">Không tải được dữ liệu thư viện (${esc(e.message||e)}). Hãy tải lại trang.</div></section>`; });
setTimeout(()=>{ if(aiState==='checking'){ aiState='off'; refreshAIPill(); } },11000);
})();
