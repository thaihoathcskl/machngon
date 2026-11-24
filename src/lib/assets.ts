/**
 * Public editorial artwork registry served from /public/assets/images/
 * (sourced from the machngon-v2 visual corpus).
 * Also maintains full backward-compatible mapping for any legacy /src/assets/images/* paths
 * persisted in browser storage or custom documents.
 */
export const EDITORIAL_IMAGES = {
  heroVanHien: '/assets/images/hero_van_hien.jpg',
  heroTanBienTap: '/assets/images/hero_tan_bien_tap.jpg',
  heroDaThu: '/assets/images/hero_da_thu.jpg',
  heroLucBan: '/assets/images/hero_luc_ban.jpg',
  coverPhilosophyFreedom: '/assets/images/cover_th.jpg',
  coverLanguageThought: '/assets/images/cover_nn.jpg',
  coverLiteratureCulture: '/assets/images/cover_vh.jpg',
  coverEthicsDebate: '/assets/images/cover_tt.jpg',
  coverLogicGeometry: '/assets/images/cover_lt.jpg',
  coverCriticalInquiry: '/assets/images/cover_pb.jpg',
  coverInterdisciplinaryWorld: '/assets/images/cover_kh.jpg',
  coverLibraryReadingHall: '/assets/images/cover_lib.jpg',
  brandLogo: '/assets/images/logo.png',
} as const;

export const EDITORIAL_COVER_CATALOG = [
  {
    label: 'Văn học & Hiên tre cổ điển Việt Nam',
    src: '/assets/images/cover_vh.jpg',
  },
  {
    label: 'Ngôn ngữ & Bàn thư phòng gỗ sồi',
    src: '/assets/images/cover_nn.jpg',
  },
  {
    label: 'Logic & Cân lý lẽ · Tam đoạn luận',
    src: '/assets/images/cover_lt.jpg',
  },
  {
    label: 'Tư duy phản biện & Kính lúp tra cứu',
    src: '/assets/images/cover_pb.jpg',
  },
  {
    label: 'Triết học & Hành lang đá cổ điển',
    src: '/assets/images/cover_th.jpg',
  },
  {
    label: 'Truyền thông số & Giảng đường đối thoại',
    src: '/assets/images/cover_tt.jpg',
  },
  {
    label: 'Liên ngành & Ban công thư viện bầu trời sao',
    src: '/assets/images/cover_kh.jpg',
  },
  {
    label: 'Đại sảnh Thư viện Tri thức cổ điển',
    src: '/assets/images/cover_lib.jpg',
  },
  {
    label: 'Thư phòng Văn Hiến ánh nắng ấm',
    src: '/assets/images/hero_van_hien.jpg',
  },
  {
    label: 'Thư viện Dạ Thư ánh đèn đêm',
    src: '/assets/images/hero_da_thu.jpg',
  },
  {
    label: 'Phòng biên tập Tân Biên Tập',
    src: '/assets/images/hero_tan_bien_tap.jpg',
  },
  {
    label: 'Không gian học thuật Lục Bản',
    src: '/assets/images/hero_luc_ban.jpg',
  },
] as const;

const ASSET_PATH_MAP: Record<string, string> = {
  // Legacy /src/assets/images/* paths -> new public /assets/images/* paths
  '/src/assets/images/hero_van_hien_1795223386896.jpg': '/assets/images/hero_van_hien.jpg',
  '/src/assets/images/hero_tan_bien_tap_1795223391644.jpg': '/assets/images/hero_tan_bien_tap.jpg',
  '/src/assets/images/hero_da_thu_1795223388848.jpg': '/assets/images/hero_da_thu.jpg',
  '/src/assets/images/hero_luc_ban_1795223386407.jpg': '/assets/images/hero_luc_ban.jpg',
  '/src/assets/images/cover_philosophy_freedom_1795223385361.jpg': '/assets/images/cover_th.jpg',
  '/src/assets/images/cover_language_thought_1795223385514.jpg': '/assets/images/cover_nn.jpg',
  '/src/assets/images/cover_literature_culture_1795223385935.jpg': '/assets/images/cover_vh.jpg',
  '/src/assets/images/cover_ethics_debate_1795223395652.jpg': '/assets/images/cover_tt.jpg',
  '/src/assets/images/cover_logic_geometry_1795261279369.jpg': '/assets/images/cover_lt.jpg',
  '/src/assets/images/cover_critical_inquiry_1795261545337.jpg': '/assets/images/cover_pb.jpg',
  '/src/assets/images/cover_interdisciplinary_world_1795261299848.jpg': '/assets/images/cover_kh.jpg',
  '/src/assets/images/cover_library_reading_hall_1795261276717.jpg': '/assets/images/cover_lib.jpg',
  // Direct relative img/ references from machngon-v2
  'img/hero_van_hien.jpg': '/assets/images/hero_van_hien.jpg',
  'img/hero_tan_bien_tap.jpg': '/assets/images/hero_tan_bien_tap.jpg',
  'img/hero_da_thu.jpg': '/assets/images/hero_da_thu.jpg',
  'img/hero_luc_ban.jpg': '/assets/images/hero_luc_ban.jpg',
  'img/cover_vh.jpg': '/assets/images/cover_vh.jpg',
  'img/cover_nn.jpg': '/assets/images/cover_nn.jpg',
  'img/cover_lt.jpg': '/assets/images/cover_lt.jpg',
  'img/cover_pb.jpg': '/assets/images/cover_pb.jpg',
  'img/cover_th.jpg': '/assets/images/cover_th.jpg',
  'img/cover_tt.jpg': '/assets/images/cover_tt.jpg',
  'img/cover_kh.jpg': '/assets/images/cover_kh.jpg',
  'img/cover_lib.jpg': '/assets/images/cover_lib.jpg',
  'img/logo.png': '/assets/images/logo.png',
};

export function resolveEditorialAsset(src: string): string {
  return ASSET_PATH_MAP[src] ?? src;
}
