export type Lang = 'en' | 'ko' | 'ja' | 'zh' | 'ru' | 'es';

export const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한국어' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '简体中文' },
  { value: 'ru', label: 'Русский' },
  { value: 'es', label: 'Español' }
];

export const LS_LANG = 'arc-node-dashboard-lang';

export function parseLang(raw: string | null): Lang {
  if (raw === 'ko' || raw === 'ja' || raw === 'zh' || raw === 'ru' || raw === 'es' || raw === 'en') return raw;
  return 'en';
}

export type NavId =
  | 'overview'
  | 'node'
  | 'sync'
  | 'blocks'
  | 'txs'
  | 'prometheus'
  | 'logs'
  | 'config'
  | 'docs'
  | 'alerts'
  | 'settings';

type Dict = {
  nav: Record<NavId, string>;
  searchPlaceholder: string;
  allHealthy: string;
  needsAttention: string;
  upToDate: string;
  footerOperational: string;
  backToOverview: string;
  backToSettings: string;
  settings: string;
  pollInterval: string;
  save: string;
  networkRpcHint: string;
  networkRpcPlaceholder: string;
  allowedHosts: string;
  openRpcConsole: string;
  rpcConsole: string;
  invoke: string;
  result: string;
  paramsParseError: string;
  requestFailed: string;
  refresh: string;
  refreshing: string;
  syncProgress: string;
  localBlock: string;
  networkBlock: string;
  nodeStatusLoading: string;
  remoteRpcWarning: string;
  finality: string;
  finalityMeasured: string;
  finalityDoc: string;
  chainIdMismatch: string;
  headChartTitle: string;
  headChartSubtitle: string;
  chartLoading: string;
  resources: string;
  resourcesHint: string;
  chainProfile: string;
  recentBlocks: string;
  recentTxs: string;
  noTxs: string;
  prometheusTitle: string;
  prometheusSubtitle: string;
  liveLogs: string;
  follow: string;
  clear: string;
  noLogs: string;
  configValidation: string;
  docAssistant: string;
  docConnected: string;
  docEmpty: string;
  docSearch: string;
  docPlaceholder: string;
  docDefaultQuery: string;
  docNoResults: string;
  docDoc: string;
  roleUser: string;
  roleAssistant: string;
  factEvm: string;
  factGas: string;
  factConsensus: string;
  factBlockTime: string;
  factChainId: string;
  factPermissionless: string;
  cfgLocalRpc: string;
  cfgExecRpc: string;
  cfgChainId: string;
  cfgPrometheus: string;
  cfgIpc: string;
  cfgSync: string;
  pillExecution: string;
  pillConsensus: string;
  pillIpc: string;
  pillElMetrics: string;
  pillClMetrics: string;
  pillRelay: string;
  timeJustNow: string;
  timeSecondsAgo: string;
  timeMinutesAgo: string;
  timeHoursAgo: string;
  measuring: string;
  finalityDocShort: string;
  chartPollingEmpty: string;
  chartRpcLatency: string;
  chartBlockImportRate: string;
  chartSyncStage: string;
  chartLocalHead: string;
  chartNetworkHead: string;
};

const en: Dict = {
  nav: {
    overview: 'Overview',
    node: 'Node Status',
    sync: 'Sync & Finality',
    blocks: 'Blocks',
    txs: 'Transactions',
    prometheus: 'Prometheus Metrics',
    logs: 'Logs',
    config: 'Config Validator',
    docs: 'Arc Docs Assistant',
    alerts: 'Alerts',
    settings: 'Settings'
  },
  searchPlaceholder: 'Search dashboard, metrics, logs…',
  allHealthy: 'All Systems Healthy',
  needsAttention: 'Needs attention',
  upToDate: 'Up to date',
  footerOperational: 'All systems operational',
  backToOverview: '← Back to Overview',
  backToSettings: '← Back to Settings',
  settings: 'Settings',
  pollInterval: 'Poll interval (ms)',
  save: 'Save',
  networkRpcHint: 'Network reference RPC (optional, for head comparison)',
  networkRpcPlaceholder: 'Leave empty to estimate network head from eth_syncing',
  allowedHosts: 'Allowed hosts: *.arc.network, localhost, 127.0.0.1 ·',
  openRpcConsole: 'Open RPC console',
  rpcConsole: 'RPC Console',
  invoke: 'Invoke',
  result: 'Result',
  paramsParseError: 'Failed to parse params JSON',
  requestFailed: 'Request failed',
  refresh: 'Refresh',
  refreshing: 'Refreshing…',
  syncProgress: 'Sync Progress',
  localBlock: 'Local Block',
  networkBlock: 'Network Block',
  nodeStatusLoading: 'Loading node-status…',
  remoteRpcWarning:
    'Remote RPC only — run the dashboard on the same Ubuntu host as the node for metrics and journal logs.',
  finality: 'Finality',
  finalityMeasured: 'Measured block interval',
  finalityDoc: 'Arc testnet ~0.48s (docs)',
  chainIdMismatch: 'Chain ID does not match Testnet.',
  headChartTitle: 'Head / Checkpoint progression',
  headChartSubtitle: 'Local head vs network head per poll',
  chartLoading: 'Loading chart…',
  resources: 'Resources',
  resourcesHint: 'OS and disk metrics when the dashboard runs on the same host as the node',
  chainProfile: 'Chain profile',
  recentBlocks: 'Recent Blocks',
  recentTxs: 'Recent Transactions',
  noTxs: 'No transactions in the latest block or still loading.',
  prometheusTitle: 'Prometheus Metrics',
  prometheusSubtitle: 'RPC latency · block import · head gap',
  liveLogs: 'Live Logs',
  follow: 'Follow',
  clear: 'Clear',
  noLogs: 'No logs.',
  configValidation: 'Configuration Validation',
  docAssistant: 'Arc Docs Assistant',
  docConnected: 'Connected · search_arc_docs',
  docEmpty: 'Enter a question and search.',
  docSearch: 'Search',
  docPlaceholder: "Why isn't my node syncing?",
  docDefaultQuery: 'What should I check when the node is not syncing?',
  docNoResults: 'No results. Try a different question.',
  docDoc: 'Document',
  roleUser: 'user',
  roleAssistant: 'assistant',
  factEvm: 'EVM compatible (Prague)',
  factGas: 'Gas token: USDC',
  factConsensus: 'Consensus: Malachite BFT',
  factBlockTime: 'Block time: ~0.48s (testnet)',
  factChainId: 'Chain ID: 5042002',
  factPermissionless: 'Permissionless developer access',
  cfgLocalRpc: 'Local node RPC (127.0.0.1:8545)',
  cfgExecRpc: 'Execution RPC (8545) responding',
  cfgChainId: 'Chain ID 5042002 (Arc Testnet)',
  cfgPrometheus: 'Prometheus EL:9001 · CL:29000',
  cfgIpc: 'IPC sockets /run/arc/*.ipc',
  cfgSync: 'Sync complete or in progress',
  pillExecution: 'Execution active',
  pillConsensus: 'Consensus active',
  pillIpc: 'IPC OK',
  pillElMetrics: 'EL metrics :9001',
  pillClMetrics: 'CL metrics :29000',
  pillRelay: 'Relay follow',
  timeJustNow: 'just now',
  timeSecondsAgo: '{n}s ago',
  timeMinutesAgo: '{n}m ago',
  timeHoursAgo: '{n}h ago',
  measuring: 'Measuring…',
  finalityDocShort: '~0.48s (docs)',
  chartPollingEmpty: 'Graph will appear as polling data accumulates.',
  chartRpcLatency: 'RPC response time',
  chartBlockImportRate: 'Block import rate (relative)',
  chartSyncStage: 'Sync stage (relative)',
  chartLocalHead: 'Local head',
  chartNetworkHead: 'Network head'
};

const ko: Dict = {
  ...en,
  nav: {
    overview: '개요',
    node: '노드 상태',
    sync: '동기화 및 확정',
    blocks: '블록',
    txs: '트랜잭션',
    prometheus: 'Prometheus 메트릭',
    logs: '로그',
    config: '설정 검증',
    docs: 'Arc Docs Assistant',
    alerts: '알림',
    settings: '설정'
  },
  searchPlaceholder: '대시보드, 메트릭, 로그 검색…',
  needsAttention: '일부 점검 필요',
  backToOverview: '← Overview로',
  backToSettings: '← Settings로',
  pollInterval: '폴링 간격 (ms)',
  save: '저장',
  networkRpcHint: 'Network 참조 RPC (선택, 헤드 비교용)',
  networkRpcPlaceholder: '비우면 eth_syncing 기준으로 네트워크 헤드 추정',
  allowedHosts: '허용 호스트: *.arc.network, localhost, 127.0.0.1 ·',
  openRpcConsole: 'RPC 콘솔 열기',
  rpcConsole: 'RPC 콘솔',
  invoke: '호출',
  result: '결과',
  paramsParseError: 'params JSON 파싱 실패',
  requestFailed: '요청 실패',
  refresh: '새로고침',
  refreshing: '새로고침…',
  syncProgress: '동기화 진행률',
  localBlock: '로컬 블록',
  networkBlock: '네트워크 블록',
  nodeStatusLoading: 'node-status 로딩 중…',
  remoteRpcWarning:
    '원격 RPC만 연결됨 — 메트릭·journal 로그는 대시보드를 노드와 같은 Ubuntu 서버에서 실행하세요.',
  finality: '확정성',
  finalityMeasured: '측정된 블록 간격',
  finalityDoc: 'Arc testnet ~0.48s (문서)',
  chainIdMismatch: 'Chain ID가 Testnet과 다릅니다.',
  headChartTitle: '헤드 / 체크포인트 진행',
  headChartSubtitle: '폴링 시점별 로컬 헤드 vs 네트워크 헤드',
  chartLoading: '차트 로딩…',
  resources: '리소스',
  resourcesHint: '노드와 동일 호스트에서 대시보드 실행 시 OS·디스크 실측',
  chainProfile: '체인 프로필',
  recentBlocks: '최근 블록',
  recentTxs: '최근 트랜잭션',
  noTxs: '최신 블록에 표시할 트랜잭션이 없거나 로딩 중입니다.',
  prometheusTitle: 'Prometheus 메트릭',
  prometheusSubtitle: 'RPC 지연·블록 수집·헤드 차이',
  liveLogs: '실시간 로그',
  follow: '따라가기',
  clear: '지우기',
  noLogs: '로그가 없습니다.',
  configValidation: '설정 검증',
  docEmpty: '질문을 입력하고 검색해 보세요.',
  docSearch: '검색',
  docPlaceholder: '노드가 동기화되지 않는 이유는?',
  docDefaultQuery: '노드가 동기화되지 않을 때 확인할 것은?',
  docNoResults: '검색 결과가 없습니다. 질문을 바꿔 보세요.',
  docDoc: '문서',
  roleUser: '사용자',
  roleAssistant: '어시스턴트',
  factEvm: 'EVM 호환 (Prague)',
  factGas: '가스 토큰: USDC',
  factConsensus: '합의: Malachite BFT',
  factBlockTime: '블록 타임: ~0.48s (testnet)',
  factChainId: 'Chain ID: 5042002',
  factPermissionless: '개발자 접근: 무허가',
  cfgLocalRpc: '로컬 노드 RPC (127.0.0.1:8545)',
  cfgExecRpc: 'Execution RPC (8545) 응답',
  cfgSync: '동기화 완료 또는 진행 중',
  timeJustNow: '방금',
  timeSecondsAgo: '{n}초 전',
  timeMinutesAgo: '{n}분 전',
  timeHoursAgo: '{n}시간 전',
  measuring: '측정 중…',
  finalityDocShort: '~0.48s (문서)',
  chartPollingEmpty: '폴링 데이터가 쌓이면 그래프가 표시됩니다.',
  chartRpcLatency: 'RPC 응답 시간',
  chartBlockImportRate: '블록 수집률 (상대)',
  chartSyncStage: '싱크 스테이지 (상대)',
  chartLocalHead: '로컬 헤드',
  chartNetworkHead: '네트워크 헤드'
};

const ja: Dict = {
  ...en,
  nav: {
    overview: '概要',
    node: 'ノード状態',
    sync: '同期とファイナリティ',
    blocks: 'ブロック',
    txs: 'トランザクション',
    prometheus: 'Prometheus メトリクス',
    logs: 'ログ',
    config: '設定検証',
    docs: 'Arc Docs Assistant',
    alerts: 'アラート',
    settings: '設定'
  },
  searchPlaceholder: 'ダッシュボード、メトリクス、ログを検索…',
  needsAttention: '要確認',
  backToOverview: '← 概要に戻る',
  backToSettings: '← 設定に戻る',
  settings: '設定',
  pollInterval: 'ポーリング間隔 (ms)',
  save: '保存',
  networkRpcHint: 'ネットワーク参照 RPC（任意、ヘッド比較）',
  networkRpcPlaceholder: '空欄の場合は eth_syncing からネットワークヘッドを推定',
  allowedHosts: '許可ホスト: *.arc.network, localhost, 127.0.0.1 ·',
  openRpcConsole: 'RPC コンソールを開く',
  rpcConsole: 'RPC コンソール',
  invoke: '実行',
  result: '結果',
  paramsParseError: 'params JSON の解析に失敗',
  requestFailed: 'リクエスト失敗',
  refresh: '更新',
  refreshing: '更新中…',
  syncProgress: '同期進捗',
  localBlock: 'ローカルブロック',
  networkBlock: 'ネットワークブロック',
  nodeStatusLoading: 'node-status 読み込み中…',
  remoteRpcWarning:
    'リモート RPC のみ — メトリクスと journal はノードと同じ Ubuntu でダッシュボードを実行してください。',
  finality: 'ファイナリティ',
  finalityMeasured: '測定されたブロック間隔',
  finalityDoc: 'Arc testnet ~0.48s（ドキュメント）',
  chainIdMismatch: 'Chain ID が Testnet と一致しません。',
  headChartTitle: 'ヘッド / チェックポイント進行',
  headChartSubtitle: 'ポーリングごとのローカル vs ネットワークヘッド',
  chartLoading: 'チャート読み込み中…',
  resourcesHint: 'ノードと同じホストで実行時に OS・ディスクを実測',
  chainProfile: 'チェーンプロファイル',
  recentBlocks: '最近のブロック',
  recentTxs: '最近のトランザクション',
  noTxs: '最新ブロックにトランザクションがないか、読み込み中です。',
  prometheusSubtitle: 'RPC 遅延・ブロック取込・ヘッド差',
  liveLogs: 'ライブログ',
  follow: '追従',
  clear: 'クリア',
  noLogs: 'ログがありません。',
  configValidation: '設定検証',
  docEmpty: '質問を入力して検索してください。',
  docSearch: '検索',
  docPlaceholder: 'ノードが同期しない理由は？',
  docDefaultQuery: 'ノードが同期しないときに確認することは？',
  docNoResults: '結果がありません。別の質問を試してください。',
  docDoc: 'ドキュメント',
  roleUser: 'ユーザー',
  roleAssistant: 'アシスタント',
  measuring: '測定中…',
  finalityDocShort: '~0.48s（ドキュメント）',
  chartPollingEmpty: 'ポーリングデータが蓄積されるとグラフが表示されます。',
  chartRpcLatency: 'RPC 応答時間',
  chartBlockImportRate: 'ブロック取込率（相対）',
  chartSyncStage: '同期ステージ（相対）',
  chartLocalHead: 'ローカルヘッド',
  chartNetworkHead: 'ネットワークヘッド'
};

const zh: Dict = {
  ...en,
  nav: {
    overview: '概览',
    node: '节点状态',
    sync: '同步与最终性',
    blocks: '区块',
    txs: '交易',
    prometheus: 'Prometheus 指标',
    logs: '日志',
    config: '配置验证',
    docs: 'Arc Docs Assistant',
    alerts: '告警',
    settings: '设置'
  },
  searchPlaceholder: '搜索仪表盘、指标、日志…',
  needsAttention: '需要检查',
  backToOverview: '← 返回概览',
  backToSettings: '← 返回设置',
  settings: '设置',
  pollInterval: '轮询间隔 (ms)',
  save: '保存',
  networkRpcHint: '网络参考 RPC（可选，用于头块比较）',
  networkRpcPlaceholder: '留空则根据 eth_syncing 估算网络头',
  allowedHosts: '允许的主机: *.arc.network, localhost, 127.0.0.1 ·',
  openRpcConsole: '打开 RPC 控制台',
  rpcConsole: 'RPC 控制台',
  invoke: '调用',
  result: '结果',
  paramsParseError: 'params JSON 解析失败',
  requestFailed: '请求失败',
  refresh: '刷新',
  refreshing: '刷新中…',
  syncProgress: '同步进度',
  localBlock: '本地区块',
  networkBlock: '网络区块',
  nodeStatusLoading: '正在加载 node-status…',
  remoteRpcWarning: '仅远程 RPC — 请在运行节点的同一 Ubuntu 主机上运行仪表盘以获取指标和 journal。',
  finality: '最终性',
  finalityMeasured: '实测出块间隔',
  finalityDoc: 'Arc testnet ~0.48s（文档）',
  chainIdMismatch: 'Chain ID 与 Testnet 不匹配。',
  headChartTitle: '链头 / 检查点进展',
  headChartSubtitle: '每次轮询的本地头 vs 网络头',
  chartLoading: '图表加载中…',
  resourcesHint: '仪表盘与节点同机运行时显示 OS 与磁盘实测',
  chainProfile: '链概况',
  recentBlocks: '最近区块',
  recentTxs: '最近交易',
  noTxs: '最新区块无交易或仍在加载。',
  prometheusSubtitle: 'RPC 延迟 · 区块导入 · 头块差距',
  liveLogs: '实时日志',
  follow: '跟随',
  clear: '清除',
  noLogs: '暂无日志。',
  configValidation: '配置验证',
  docEmpty: '输入问题并搜索。',
  docSearch: '搜索',
  docPlaceholder: '节点为什么不同步？',
  docDefaultQuery: '节点不同步时应检查什么？',
  docNoResults: '无结果，请换一个问题。',
  docDoc: '文档',
  roleUser: '用户',
  roleAssistant: '助手',
  measuring: '测量中…',
  finalityDocShort: '~0.48s（文档）',
  chartPollingEmpty: '轮询数据累积后将显示图表。',
  chartRpcLatency: 'RPC 响应时间',
  chartBlockImportRate: '区块导入率（相对）',
  chartSyncStage: '同步阶段（相对）',
  chartLocalHead: '本地链头',
  chartNetworkHead: '网络链头'
};

const ru: Dict = {
  ...en,
  nav: {
    overview: 'Обзор',
    node: 'Статус узла',
    sync: 'Синхронизация',
    blocks: 'Блоки',
    txs: 'Транзакции',
    prometheus: 'Метрики Prometheus',
    logs: 'Логи',
    config: 'Проверка конфигурации',
    docs: 'Arc Docs Assistant',
    alerts: 'Оповещения',
    settings: 'Настройки'
  },
  searchPlaceholder: 'Поиск по панели, метрикам, логам…',
  needsAttention: 'Требуется внимание',
  backToOverview: '← К обзору',
  backToSettings: '← К настройкам',
  settings: 'Настройки',
  pollInterval: 'Интервал опроса (мс)',
  save: 'Сохранить',
  networkRpcHint: 'Справочный RPC сети (необязательно)',
  networkRpcPlaceholder: 'Пусто — оценка головы сети через eth_syncing',
  allowedHosts: 'Разрешённые хосты: *.arc.network, localhost, 127.0.0.1 ·',
  openRpcConsole: 'Открыть RPC-консоль',
  rpcConsole: 'RPC-консоль',
  invoke: 'Вызвать',
  result: 'Результат',
  paramsParseError: 'Ошибка разбора params JSON',
  requestFailed: 'Ошибка запроса',
  refresh: 'Обновить',
  refreshing: 'Обновление…',
  syncProgress: 'Прогресс синхронизации',
  localBlock: 'Локальный блок',
  networkBlock: 'Блок сети',
  nodeStatusLoading: 'Загрузка node-status…',
  remoteRpcWarning:
    'Только удалённый RPC — запустите панель на том же Ubuntu, что и узел, для метрик и journal.',
  finality: 'Финальность',
  finalityMeasured: 'Измеренный интервал блоков',
  finalityDoc: 'Arc testnet ~0.48s (документация)',
  chainIdMismatch: 'Chain ID не совпадает с Testnet.',
  headChartTitle: 'Прогресс головы / checkpoint',
  headChartSubtitle: 'Локальная vs сетевая голова при каждом опросе',
  chartLoading: 'Загрузка графика…',
  resourcesHint: 'Метрики ОС и диска при запуске на том же хосте, что узел',
  chainProfile: 'Профиль сети',
  recentBlocks: 'Недавние блоки',
  recentTxs: 'Недавние транзакции',
  noTxs: 'Нет транзакций в последнем блоке или загрузка.',
  prometheusSubtitle: 'Задержка RPC · импорт блоков · разрыв головы',
  liveLogs: 'Живые логи',
  follow: 'Следовать',
  clear: 'Очистить',
  noLogs: 'Нет логов.',
  configValidation: 'Проверка конфигурации',
  docEmpty: 'Введите вопрос и выполните поиск.',
  docSearch: 'Поиск',
  docPlaceholder: 'Почему узел не синхронизируется?',
  docDefaultQuery: 'Что проверить, если узел не синхронизируется?',
  docNoResults: 'Нет результатов. Попробуйте другой вопрос.',
  docDoc: 'Документ',
  roleUser: 'пользователь',
  roleAssistant: 'ассистент',
  measuring: 'Измерение…',
  finalityDocShort: '~0.48s (док.)',
  chartPollingEmpty: 'График появится по мере накопления данных опроса.',
  chartRpcLatency: 'Время ответа RPC',
  chartBlockImportRate: 'Скорость импорта блоков (относ.)',
  chartSyncStage: 'Этап синхронизации (относ.)',
  chartLocalHead: 'Локальная голова',
  chartNetworkHead: 'Голова сети'
};

const es: Dict = {
  ...en,
  nav: {
    overview: 'Resumen',
    node: 'Estado del nodo',
    sync: 'Sincronización',
    blocks: 'Bloques',
    txs: 'Transacciones',
    prometheus: 'Métricas Prometheus',
    logs: 'Registros',
    config: 'Validación de config',
    docs: 'Arc Docs Assistant',
    alerts: 'Alertas',
    settings: 'Ajustes'
  },
  searchPlaceholder: 'Buscar panel, métricas, logs…',
  needsAttention: 'Requiere atención',
  backToOverview: '← Volver al resumen',
  backToSettings: '← Volver a ajustes',
  settings: 'Ajustes',
  pollInterval: 'Intervalo de sondeo (ms)',
  save: 'Guardar',
  networkRpcHint: 'RPC de referencia de red (opcional)',
  networkRpcPlaceholder: 'Vacío: estimar cabeza de red con eth_syncing',
  allowedHosts: 'Hosts permitidos: *.arc.network, localhost, 127.0.0.1 ·',
  openRpcConsole: 'Abrir consola RPC',
  rpcConsole: 'Consola RPC',
  invoke: 'Invocar',
  result: 'Resultado',
  paramsParseError: 'Error al analizar params JSON',
  requestFailed: 'Solicitud fallida',
  refresh: 'Actualizar',
  refreshing: 'Actualizando…',
  syncProgress: 'Progreso de sync',
  localBlock: 'Bloque local',
  networkBlock: 'Bloque de red',
  nodeStatusLoading: 'Cargando node-status…',
  remoteRpcWarning:
    'Solo RPC remoto — ejecute el panel en el mismo Ubuntu que el nodo para métricas y journal.',
  finality: 'Finalidad',
  finalityMeasured: 'Intervalo de bloque medido',
  finalityDoc: 'Arc testnet ~0.48s (docs)',
  chainIdMismatch: 'Chain ID no coincide con Testnet.',
  headChartTitle: 'Progresión de cabeza / checkpoint',
  headChartSubtitle: 'Cabeza local vs red por sondeo',
  chartLoading: 'Cargando gráfico…',
  resourcesHint: 'Métricas de SO y disco cuando el panel corre en el mismo host que el nodo',
  chainProfile: 'Perfil de cadena',
  recentBlocks: 'Bloques recientes',
  recentTxs: 'Transacciones recientes',
  noTxs: 'Sin transacciones en el último bloque o cargando.',
  prometheusSubtitle: 'Latencia RPC · importación · brecha de cabeza',
  liveLogs: 'Logs en vivo',
  follow: 'Seguir',
  clear: 'Limpiar',
  noLogs: 'Sin logs.',
  configValidation: 'Validación de configuración',
  docEmpty: 'Escriba una pregunta y busque.',
  docSearch: 'Buscar',
  docPlaceholder: '¿Por qué no sincroniza mi nodo?',
  docDefaultQuery: '¿Qué revisar si el nodo no sincroniza?',
  docNoResults: 'Sin resultados. Pruebe otra pregunta.',
  docDoc: 'Documento',
  roleUser: 'usuario',
  roleAssistant: 'asistente',
  measuring: 'Midiendo…',
  finalityDocShort: '~0.48s (docs)',
  chartPollingEmpty: 'El gráfico aparecerá cuando se acumulen datos de sondeo.',
  chartRpcLatency: 'Tiempo de respuesta RPC',
  chartBlockImportRate: 'Tasa de importación de bloques (rel.)',
  chartSyncStage: 'Etapa de sync (rel.)',
  chartLocalHead: 'Cabeza local',
  chartNetworkHead: 'Cabeza de red'
};

const TABLE: Record<Lang, Dict> = { en, ko, ja, zh, ru, es };

export function getDict(lang: Lang): Dict {
  return TABLE[lang] ?? en;
}

const LOCALE: Record<Lang, string> = {
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ru: 'ru-RU',
  es: 'es-ES'
};

export function localeForLang(lang: Lang): string {
  return LOCALE[lang] ?? 'en-US';
}

export function formatTimeAgo(lang: Lang, seconds: number): string {
  const d = getDict(lang);
  if (seconds < 5) return d.timeJustNow;
  if (seconds < 60) return d.timeSecondsAgo.replace('{n}', String(seconds));
  const m = Math.floor(seconds / 60);
  if (m < 60) return d.timeMinutesAgo.replace('{n}', String(m));
  return d.timeHoursAgo.replace('{n}', String(Math.floor(m / 60)));
}
