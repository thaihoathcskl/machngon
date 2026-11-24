import { EightTokenPalette } from './wcag';

export type PresetId = 'van-hien' | 'tan-bien-tap' | 'da-thu' | 'luc-ban';
export type ColorMode = 'preset' | 'quick' | 'detailed';

export interface ThemePreset {
  id: PresetId;
  name: string;
  subtitle: string;
  atmosphere: string;
  mode: 'light' | 'dark';
  heroImage: string;
  heroAlt: string;
  swatches?: string[];
  tokens: EightTokenPalette;
}

export const THEME_PRESETS: Record<PresetId, ThemePreset> = {
  'van-hien': {
    id: 'van-hien',
    name: 'Văn Hiến',
    subtitle: 'Kem ngà · Đỏ rượu · Vàng đồng cổ điển',
    atmosphere: 'Thư viện cổ điển, giá sách gỗ sồi, ánh sáng kem ngà và sắc đỏ rượu trầm ấm.',
    mode: 'light',
    heroImage: '/assets/images/hero_van_hien.jpg',
    heroAlt: 'Thư viện cổ điển Văn Hiến với giá sách gỗ sồi và ánh sáng vàng ấm',
    swatches: ['#F7F2E9', '#342D28', '#783E47', '#B99A62', '#DFD4C3'],
    tokens: {
      bg: '#F7F2E9',
      surface: '#FCF9F3',
      surfaceMuted: '#EFE6D7',
      text: '#342D28',
      textMuted: '#6D6157',
      primary: '#783E47',
      primaryHover: '#612F37',
      border: '#DFD4C3',
      gold: '#B99A62',
      onPrimary: '#FFFFFF',
    },
  },
  'tan-bien-tap': {
    id: 'tan-bien-tap',
    name: 'Tân Biên Tập',
    subtitle: 'Trắng biên tập · Xanh mực',
    atmosphere: 'Thư phòng tối giản hiện đại, ánh sáng trắng tinh gọn.',
    mode: 'light',
    heroImage: '/assets/images/hero_tan_bien_tap.jpg',
    heroAlt: 'Thư phòng tối giản Tân Biên Tập với ánh sáng tự nhiên tinh gọn',
    tokens: {
      bg: '#F8F9FA',
      surface: '#FFFFFF',
      surfaceMuted: '#ECEFF3',
      text: '#14181F',
      textMuted: '#535D6B',
      primary: '#1E3A5F',
      primaryHover: '#152A47',
      border: '#D7DDE6',
      gold: '#9B8252',
      onPrimary: '#FFFFFF',
    },
  },
  'da-thu': {
    id: 'da-thu',
    name: 'Tinh Mộng',
    subtitle: 'Tím huyền ảo · Hồng pastel · Kem ngà · Đỏ rượu',
    atmosphere: 'Thư viện đêm ánh sao huyền ảo, sắc tím mộng mơ kết hợp hồng pastel dịu mắt.',
    mode: 'dark',
    heroImage: '/assets/images/hero_da_thu.jpg',
    heroAlt: 'Thư viện đêm Tinh Mộng với sắc tím huyền ảo, ánh sao dịu và hồng pastel',
    swatches: ['#7358B8', '#EBB8D2', '#F7F2E9', '#C0BACD', '#7A324E'],
    tokens: {
      bg: '#1E182B',
      surface: '#282038',
      surfaceMuted: '#3E253B',
      text: '#F7F2E9',
      textMuted: '#C0BACD',
      primary: '#6D52B3',
      primaryHover: '#7D3B56',
      border: '#44385B',
      gold: '#EBB8D2',
      onPrimary: '#FFFFFF',
    },
  },
  'luc-ban': {
    id: 'luc-ban',
    name: 'Lục Bản',
    subtitle: 'Giấy lục nhạt · Xanh rừng',
    atmosphere: 'Góc đọc sách bên cửa sổ ngập sáng tự nhiên và sắc xanh cây cỏ.',
    mode: 'light',
    heroImage: '/assets/images/hero_luc_ban.jpg',
    heroAlt: 'Góc đọc sách Lục Bản bên khung cửa sổ ngập sắc xanh cây cỏ',
    tokens: {
      bg: '#F5F8F5',
      surface: '#FCFDFC',
      surfaceMuted: '#E6EFE7',
      text: '#18241B',
      textMuted: '#4C5E50',
      primary: '#23533A',
      primaryHover: '#1A3F2B',
      border: '#CEDCCE',
      gold: '#9F8B57',
      onPrimary: '#FFFFFF',
    },
  },
};

export const PRESET_LIST: ThemePreset[] = [
  THEME_PRESETS['van-hien'],
  THEME_PRESETS['tan-bien-tap'],
  THEME_PRESETS['da-thu'],
  THEME_PRESETS['luc-ban'],
];

export interface SavedThemeConfig {
  presetId: PresetId;
  colorMode: ColorMode;
  customTokens: EightTokenPalette;
}

export const DEFAULT_THEME_CONFIG: SavedThemeConfig = {
  presetId: 'van-hien',
  colorMode: 'preset',
  customTokens: THEME_PRESETS['van-hien'].tokens,
};
