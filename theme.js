export const SWATCHES = [
  '#b8705c', '#3f8f82', '#bc9440', '#7b6ca6', '#5b7b8b',
  '#4a7ba6', '#8a9a4b', '#c2685a', '#a6873f', '#5c7a99',
  '#9a5c8f', '#6b8a5c',
];

export const GOLD = '#d9a441';
export const BLUE = '#eaf2fb';
export const CARD = '#ffffff';
export const INK = '#1c2b3a';
export const DIM = '#6b7684';
export const ROSE = '#e5484d';
export const BORDER = '#e4e9ee';

export const shared = {
  safe: { flex: 1, backgroundColor: BLUE },
  centered: { justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, paddingBottom: 100 },
  h1: { fontSize: 28, fontWeight: '700', color: INK },
  tagline: { color: DIM, marginTop: 2, marginBottom: 16 },
  block: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  blockHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockTitle: { fontSize: 16, fontWeight: '600', color: INK },
  countBadge: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowName: { flex: 1, fontSize: 15, color: INK, marginLeft: 8 },
  rowRight: { fontSize: 13, fontWeight: '600', color: DIM },
  thumb44: { width: 44, height: 44, borderRadius: 10 },
  thumb66: { width: 66, height: 66, borderRadius: 12 },
  searchInput: {
    backgroundColor: '#f2f5f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
    color: INK,
  },
  catHead: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9aa5b1',
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 4,
  },
};

