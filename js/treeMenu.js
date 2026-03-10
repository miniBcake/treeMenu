/**
 * @fileoverview Bootstrap 5 & Bootstrap Icons 기반 범용 트리 메뉴 컴포넌트
 *
 * 조직도(부서/사원), 파일 시스템(폴더/파일), 카테고리 계층 등
 * 다양한 계층형 데이터를 동일한 인터페이스로 표현합니다.
 *
 *
 * @module TreeMenu
 * @requires Bootstrap 5 (CSS + JS)
 * @requires Bootstrap Icons
 * @version 1.3.0
 *
 * ### 패턴 변경 (v1.2 class → v1.3 팩토리 함수)
 * - `new TreeMenu(...)` 대신 `TreeMenu(selector, options)`로 인스턴스를 생성합니다.
 * - 내부 상태는 클로저 변수로 완전히 은닉되며, 공개 API만 반환 객체에 노출됩니다.
 * - `this` 바인딩 문제가 없고, 메서드를 변수에 구조 분해해도 안전하게 동작합니다.
 *
 * ### CSS 완전 내장
 * - 외부 CSS 파일 없이 단독 동작합니다.
 * - Bootstrap 4 `custom-control` 체크박스 스타일(indeterminate 포함)을 내장합니다.
 *
 * @example
 * // 조직도 트리
 * const orgTree = TreeMenu('#send-org-tree-nav', {
 *     data: orgData,
 *     columns: {
 *         id:         (item) => item.code || item.id,
 *         type:       (item) => item.code ? 'folder' : 'file',
 *         extraItems: 'memberList',
 *         subText:    'position_name',
 *     },
 *     icons: {
 *         folderClose: 'bi-collection-fill text-primary',
 *         folderOpen:  'bi-collection-fill text-primary',
 *         file:        'bi-person-fill text-muted',
 *     },
 *     onCheckChange: (folders, files) => {
 *         console.log('선택된 부서:', folders);
 *         console.log('선택된 사원:', files);
 *     },
 * });
 *
 * @example
 * // 파일 트리 (lazyLoad)
 * const fileTree = TreeMenu('#file-tree', {
 *     lazyLoad: true,
 *     onLazyLoad: async (raw) => await fetchChildren(raw.path),
 *     columns: {
 *         id:   'safeId',
 *         type: (item) => item.isDir ? 'folder' : 'file',
 *         icon: 'iconClass',
 *     },
 * });
 */

// ============================================================================
// JSDoc 타입 정의
// ============================================================================

/**
 * 원본 데이터 객체의 필드를 트리 내부 속성으로 매핑하는 설정입니다.
 *
 * @typedef {Object} ColumnMapping
 *
 * @property {string|function(Object): *} id
 *   노드의 고유 식별자 필드명 또는 추출 함수.
 *   함수를 사용하면 복합 키나 조건부 필드 선택이 가능합니다.
 *   - 기본값: `(item) => item.safeId || item.id || item.seq_no || item.code`
 *   @example
 *   id: 'empNo'
 *   id: (item) => item.deptCode ?? item.empId
 *
 * @property {string} name
 *   노드 표시명 필드명.
 *   - 기본값: `'name'`
 *
 * @property {string|function(Object): ('folder'|'file')} type
 *   노드 유형을 결정하는 필드명 또는 판별 함수.
 *   `'folder'`이면 하위 항목을 가질 수 있는 컨테이너, `'file'`이면 말단 노드입니다.
 *   - 기본값: `(item) => (item.isDir || item.code || (item.children?.length > 0)) ? 'folder' : 'file'`
 *   @example
 *   type: (item) => item.code ? 'folder' : 'file'
 *
 * @property {string} [children='children']
 *   동종 하위 계층(하위 부서, 하위 폴더 등)을 담은 배열 필드명.
 *
 * @property {string} [extraItems='memberList']
 *   부모 노드에 병렬로 표시할 이종(異種) 자식 항목 배열 필드명.
 *   예: 부서 노드 아래 사원 목록, 폴더 노드 아래 파일 목록.
 *   extraItems로 파싱된 노드는 Map 키에 `@{parentId}` suffix가 붙어
 *   다른 부서의 동일 멤버와 충돌 없이 각각 독립적으로 등록됩니다.
 *
 * @property {string} [subText='position_name']
 *   노드명 옆에 표시할 보조 텍스트 필드명. (예: 직급, 파일 크기)
 *
 * @property {string} [icon='iconClass']
 *   노드별 커스텀 Bootstrap Icons 클래스 필드명.
 *   지정하면 기본 폴더/파일 아이콘을 덮어씁니다.
 */

/**
 * 트리에서 사용하는 Bootstrap Icons 클래스 모음입니다.
 *
 * @typedef {Object} IconSet
 *
 * @property {string} [folderClose='bi-folder-fill text-warning']
 *   닫힌(접힌) 폴더 아이콘 클래스.
 *
 * @property {string} [folderOpen='bi-folder2-open text-warning']
 *   열린(펼쳐진) 폴더 아이콘 클래스.
 *
 * @property {string} [file='bi-file-earmark text-secondary']
 *   파일(말단 노드) 아이콘 클래스.
 *
 * @property {string} [expand='bi-chevron-right']
 *   폴더 접힘 상태의 토글 아이콘 클래스.
 *
 * @property {string} [collapse='bi-chevron-down']
 *   폴더 펼침 상태의 토글 아이콘 클래스.
 *
 * @property {string} [loading='bi-hourglass-split']
 *   Lazy Load 진행 중 표시할 로딩 아이콘 클래스.
 */

/**
 * TreeMenu 팩토리 함수에 전달하는 옵션 객체입니다.
 *
 * @typedef {Object} TreeMenuOptions
 *
 * @property {Object[]} [data=[]]
 *   초기 트리 데이터. 계층형 배열 구조를 사용합니다.
 *   `lazyLoad: true` 시에는 최상위 노드만 포함해도 됩니다.
 *
 * @property {ColumnMapping} [columns]
 *   데이터 필드 매핑 설정.
 *   미지정 키는 기본값으로 채워집니다(shallow merge).
 *
 * @property {IconSet} [icons]
 *   아이콘 클래스 오버라이드.
 *   미지정 키는 기본값으로 채워집니다(shallow merge).
 *
 * @property {boolean} [showCheckbox=true]
 *   각 노드 앞에 체크박스 표시 여부.
 *
 * @property {boolean} [cascadeCheck=true]
 *   부모 체크 시 모든 자손 자동 체크(cascade down),
 *   자식 변경 시 부모 상태 자동 갱신(cascade up) 여부.
 *
 * @property {boolean} [lazyLoad=false]
 *   `true`이면 폴더 최초 펼침 시 `onLazyLoad` 콜백으로 자식을 비동기 로드합니다.
 *   `false`이면 초기 `data`에 포함된 children/extraItems를 즉시 파싱합니다.
 *
 * @property {boolean} [lazyReload=false]
 *   `lazyLoad: true`일 때만 유효합니다.
 *   - `false`(기본): 폴더를 최초 펼칠 때 한 번만 `onLazyLoad`를 호출하고,
 *     이후 재펼침 시에는 캐시된 자식을 재사용합니다.
 *   - `true`: 폴더를 펼칠 때마다 `onLazyLoad`를 새로 호출합니다.
 *     기존 자손은 즉시 제거되며, 새 응답이 도착하면 교체됩니다.
 *     이때 이전 자손의 체크 상태를 `rawId` 기준으로 스냅샷했다가 복원합니다.
 *
 * @property {function(Object): Promise<Object[]>} [onLazyLoad=async()=>[]]
 *   `lazyLoad` 모드에서 폴더를 펼칠 때 호출되는 비동기 콜백.
 *   @param {Object} raw - 펼쳐진 폴더 노드의 원본 데이터 객체
 *   @returns {Promise<Object[]>} 자식 노드 데이터 배열
 *
 * @property {function(Object[], Object[]): void} [onCheckChange=()=>{}]
 *   체크 상태가 변경될 때마다 호출되는 콜백.
 *   @param {Object[]} folders - 현재 체크된 폴더 노드의 원본 데이터 배열
 *   @param {Object[]} files   - 현재 체크된 파일 노드의 원본 데이터 배열 (rawId 중복 제거됨)
 *
 * @property {function(Object): void} [onClick=()=>{}]
 *   노드 콘텐츠 영역 클릭 시 호출되는 콜백.
 *   @param {Object} raw - 클릭된 노드의 원본 데이터 객체
 *
 * @property {string} [emptyMessage]
 *   데이터가 없을 때 표시할 안내 문자열.
 *   미지정 시 `sendModalMode`에 따라 기본 메시지를 사용합니다.
 *
 * @property {boolean} [sendModalMode=false]
 *   `true`이면 빈 목록 메시지를 "현재 폴더에 하위 폴더가 없습니다."로 표시합니다.
 *   `false`이면 "비어있습니다."를 사용합니다.
 */

/**
 * 내부 노드 Map에 저장되는 정규화된 노드 구조입니다.
 *
 * @typedef {Object} TreeNode
 *
 * @property {string} id
 *   `"{type}:{rawId}"` 또는 extraItems의 경우 `"{type}:{rawId}@{parentId}"` 형태의
 *   Map 고유 키. 타입 간 충돌 방지 및 동일 멤버의 다중 부서 등록을 지원합니다.
 *
 * @property {*} rawId
 *   원본 데이터에서 추출한 식별자 원본 값.
 *   `getSelectedFiles()`의 중복 제거, `lazyReload` 시 체크 상태 복원에 사용됩니다.
 *
 * @property {string} name
 *   화면에 표시되는 노드명.
 *
 * @property {'folder'|'file'} type
 *   노드 유형. `'folder'`는 자식을 가질 수 있는 컨테이너, `'file'`은 말단 노드.
 *
 * @property {string} subText
 *   노드명 옆에 표시할 보조 텍스트. (예: 직급 "과장", 파일 크기 "1.2 MB")
 *
 * @property {string} fullPath
 *   이 노드까지의 상위 경로 문자열. (예: "본사 > 개발본부")
 *   자신은 포함하지 않으며, 검색 시 경로 필터링과 검색 결과 경로 표시에 사용됩니다.
 *
 * @property {string|null} parentId
 *   부모 노드의 `id`. 최상위 노드이면 `null`.
 *
 * @property {string[]} childrenIds
 *   직계 자식 노드의 `id` 배열. 삽입 순서를 유지합니다.
 *
 * @property {boolean} isChecked
 *   현재 체크 상태.
 *
 * @property {boolean} isIndeterminate
 *   자손 중 일부만 체크된 중간 상태 여부.
 *   HTML attribute로 표현 불가해 DOM 렌더링 후 JS로 별도 동기화합니다.
 *
 * @property {boolean} isExpanded
 *   폴더 펼침 여부. `false`이면 자식 HTML이 렌더링되지 않습니다.
 *
 * @property {boolean} isLoading
 *   `lazyLoad` 모드에서 `onLazyLoad` 호출 중 여부. `true`이면 스피너를 표시합니다.
 *
 * @property {boolean} isLoaded
 *   `lazyLoad` 모드에서 자식 로드 완료 여부.
 *   `lazyReload: true`이면 매 펼침 후 `false`로 리셋됩니다.
 *
 * @property {Object} raw
 *   원본 데이터 객체 참조 (변경 없이 보존).
 *   콜백(`onCheckChange`, `onClick`, `onLazyLoad`)에 그대로 전달됩니다.
 *
 * @property {string|null} customIcon
 *   노드별 커스텀 Bootstrap Icons 클래스. `null`이면 기본 아이콘을 사용합니다.
 */

/**
 * TreeMenu 인스턴스의 공개 API 인터페이스입니다.
 *
 * @typedef {Object} TreeMenuInstance
 *
 * @property {function(string): void} search
 *   키워드로 노드를 필터링하여 리스트 뷰로 전환합니다.
 *   빈 문자열을 전달하면 일반 트리 뷰로 복귀합니다.
 *   @param {string} keyword - 검색 키워드
 *
 * @property {function(Object[]): void} setData
 *   트리 데이터를 새 데이터로 교체하고 재초기화합니다.
 *   이전 상태(체크, 포커스, 검색)는 모두 초기화됩니다.
 *   @param {Object[]} newData - 새 트리 데이터 배열
 *
 * @property {function(): void} destroy
 *   컨테이너 HTML을 비우고 내부 노드 맵을 초기화합니다.
 *   이벤트 리스너는 컨테이너가 DOM에서 제거될 때 자동 정리됩니다.
 *
 * @property {function(): Object[]} getSelectedFolders
 *   현재 체크된 모든 폴더 노드의 원본 데이터 배열을 반환합니다.
 *   @returns {Object[]}
 *
 * @property {function(): Object[]} getSelectedFiles
 *   현재 체크된 모든 파일(말단) 노드의 원본 데이터 배열을 반환합니다.
 *   extraItems로 등록된 동일 멤버가 여러 부서에서 체크된 경우
 *   `rawId` 기준으로 중복을 제거하여 반환합니다.
 *   @returns {Object[]}
 *
 * @property {function(TreeNode, boolean): void} setCheck
 *   특정 노드의 체크 상태를 직접 설정합니다. cascade 및 재렌더링을 포함합니다.
 *   @param {TreeNode} node
 *   @param {boolean}  isChecked
 *
 * @property {function(TreeNode): Promise<void>} toggleNode
 *   폴더 노드를 펼치거나 접습니다. lazyLoad/lazyReload 로직을 포함합니다.
 *   @param {TreeNode} node
 *   @returns {Promise<void>}
 */

// ============================================================================
// 팩토리 함수 본체
// ============================================================================

/**
 * Bootstrap 5 & Bootstrap Icons 기반 범용 계층형 트리 메뉴를 생성합니다.
 *
 * `class` 대신 팩토리 함수 패턴을 사용합니다.
 * - 내부 상태(`nodes`, `options` 등)는 클로저로 완전히 은닉됩니다.
 * - 반환된 공개 API 메서드는 어디서 호출해도 `this` 바인딩 문제가 없습니다.
 * - `new` 키워드 없이 `TreeMenu(selector, options)` 형태로 사용합니다.
 *
 * @param {string|HTMLElement} selector
 *   트리를 렌더링할 컨테이너. CSS 선택자 문자열 또는 DOM 엘리먼트를 모두 허용합니다.
 *   유효하지 않으면 내부 메서드가 조기 반환합니다(에러를 던지지 않음).
 *
 * @param {TreeMenuOptions} [options={}]
 *   동작 및 표시 옵션. 미지정 항목은 기본값으로 채워집니다.
 *
 * @returns {TreeMenuInstance} 공개 API 객체
 *
 * @example
 * const tree = TreeMenu('#container', {
 *     data: myData,
 *     onCheckChange: (folders, files) => console.log(folders, files),
 * });
 * tree.search('홍길동');
 * const members = tree.getSelectedFiles();
 */
const TreeMenu = (selector, options = {}) => {

    // ── 클로저 상태 변수 ────────────────────────────────────────────────────

    /** @type {HTMLElement|null} 트리를 마운트할 DOM 컨테이너 */
    const container = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    /**
     * 모든 노드를 `id → TreeNode` 형태로 저장하는 플랫 맵.
     * 계층 정보는 각 노드의 `parentId` / `childrenIds`로 관리합니다.
     * @type {Map<string, TreeNode>}
     */
    const nodes = new Map();

    /**
     * 검색 모드 활성화 여부.
     * `true`이면 `_render()` 호출이 무시되고 `_renderSearchList()`가 화면을 전담합니다.
     * @type {boolean}
     */
    let isSearching = false;

    /**
     * 현재 포커스(클릭 강조) 상태인 노드의 `id`. 없으면 `null`.
     * @type {string|null}
     */
    let focusedNodeId = null;

    /**
     * 마지막 검색 결과 배열. 검색 중 체크 변경 후 재렌더링에 사용합니다.
     * @type {TreeNode[]|null}
     */
    let lastResults = null;

    /**
     * 마지막 검색 키워드(소문자). 검색 중 재렌더링 시 하이라이트에 사용합니다.
     * @type {string|null}
     */
    let lastTerm = null;

    // ── 옵션 병합 ───────────────────────────────────────────────────────────

    /**
     * 기본 아이콘 세트. 사용자 `options.icons`로 일부 키만 오버라이드 가능합니다.
     * @type {IconSet}
     */
    const defaultIcons = {
        folderClose:   'bi-folder-fill text-warning',
        folderOpen:    'bi-folder2-open text-warning',
        file:          'bi-file-earmark text-secondary',
        expand:        'bi-chevron-right',
        collapse:      'bi-chevron-down',
        loading:       'bi-hourglass-split',
    };

    /**
     * 기본 컬럼 매핑. 사용자 `options.columns`로 일부 키만 오버라이드 가능합니다.
     * @type {ColumnMapping}
     */
    const defaultColumns = {
        id:         'id',
        name:       'name',
        type:       (item) => (item.children && item.children.length > 0) ? 'folder' : 'file',
        children:   'children',
        extraItems: 'memberList',
        subText:    'position_name',
        icon:       'iconClass',
    };

    /**
     * 병합된 최종 옵션. `icons`와 `columns`는 shallow merge로 기본값이 유지됩니다.
     * @type {TreeMenuOptions & { icons: IconSet, columns: ColumnMapping }}
     */
    const opt = {
        data:          [],
        showCheckbox:  true,
        cascadeCheck:  true,
        lazyLoad:      false,
        lazyReload:    false,
        sendModalMode: false,
        emptyMessage:  null,
        onLazyLoad:    async () => [],
        onCheckChange: () => {},
        onClick:       () => {},
        ...options,
        icons:   { ...defaultIcons,   ...(options.icons   || {}) },
        columns: { ...defaultColumns, ...(options.columns || {}) },
    };

    // =========================================================================
    // 스타일 주입
    // =========================================================================

    /**
     * 컴포넌트 전용 CSS를 `<head>`에 한 번만 주입합니다.
     *
     * 포함 항목:
     * - TreeMenu 레이아웃 스타일 (`tree-menu-*` 네임스페이스)
     * - Bootstrap 4 `custom-control` 체크박스 전체 스타일
     * - indeterminate(−) 상태 스타일 (SVG data URI 사용)
     * - 로딩 스피너 애니메이션
     *
     * 이미 `id="tree-menu-style"` 태그가 있으면 주입을 건너뜁니다.
     *
     * @returns {void}
     */
    const _injectStyles = () => {
        if (document.getElementById('tree-menu-style')) return;
        const style = document.createElement('style');
        style.id = 'tree-menu-style';
        style.textContent = `
/* ══════════════════════════════════════════════════════════════
   TreeMenu 전용 스타일 — 외부 CSS 파일 없이 단독 동작
   Bootstrap 5 + Bootstrap Icons 만 필요합니다.
   ══════════════════════════════════════════════════════════════ */

/* ── 레이아웃 & 기본 ─────────────────────────────────────────── */
.tree-menu-nav-link {
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    border: 0;
    border-radius: 0.25rem;
    text-decoration: none;
    color: inherit;
}
.tree-menu-nav-link:hover       { background-color: rgba(78,115,223,0.05); }
.tree-menu-nav-link.is-focused  { background-color: rgba(78,115,223,0.08); }
.tree-menu-cursor               { cursor: pointer; }

/* ── 뎁스 라인 ───────────────────────────────────────────────── */
.tree-menu-children {
    margin-left: 1rem;
    padding-left: 0.5rem;
    border-left: 1px solid #f0f0f0;
}

/* ── 빈 목록 ─────────────────────────────────────────────────── */
.tree-menu-empty { color: #c6c7c8; font-size: 0.85rem; }

/* ── 검색 리스트 ─────────────────────────────────────────────── */
.tree-menu-search-item:hover    { background-color: rgba(78,115,223,0.04); }
.tree-menu-search-item.is-focused {
    border-left: 3px solid #4e73df !important;
    background-color: #f8f9fa;
}
.tree-menu-highlight { background-color: #fff3cd; padding: 0; border-radius: 2px; }

/* ── 로딩 스피너 ─────────────────────────────────────────────── */
@keyframes tree-menu-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
.tree-menu-spin { display: inline-block; animation: tree-menu-spin 1s linear infinite; }

/* ══════════════════════════════════════════════════════════════
   체크박스
   ══════════════════════════════════════════════════════════════ */
.tree-menu-root .form-check {
    min-height: 1.5rem;
    padding-left: 1.75em; /* 체크박스와 아이콘 사이 간격 확보 */
    margin-bottom: 0;
    display: flex;
    align-items: center;
}

.tree-menu-root .form-check-input {
    margin-top: 0; /* 중앙 정렬 유지 */
    margin-left: -1.75em;
    cursor: pointer;
}

/* Indeterminate (중간 상태 - 아이콘 설정) */
.tree-menu-root .form-check-input:indeterminate {
    background-color: #0d6efd; /* 기본 primary 색상 */
    border-color: #0d6efd;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3e%3cline x1='5' y1='10' x2='15' y2='10' stroke='%23fff' stroke-width='3' stroke-linecap='round'/%3e%3c/svg%3e");
}
/* ══════════════════════════════════════════════════════════════ */
        `;
        document.head.appendChild(style);
    };

    // =========================================================================
    // 초기화
    // =========================================================================

    /**
     * 노드 맵을 초기화하고 데이터를 파싱한 뒤 렌더링 및 이벤트를 설정합니다.
     * `setData()` 호출 시 재사용됩니다.
     *
     * @returns {void}
     */
    const _init = () => {
        nodes.clear();
        isSearching   = false;
        focusedNodeId = null;
        lastResults   = null;
        lastTerm      = null;

        if (opt.data && opt.data.length > 0) {
            _parseData(opt.data);
        }
        _render();
        _setupEvents();
    };

    // =========================================================================
    // 데이터 파싱
    // =========================================================================

    /**
     * 계층형 원본 데이터 배열을 재귀적으로 순회하여 내부 노드 맵에 등록합니다.
     *
     * 처리 순서:
     * 1. `columns.id` / `columns.type`으로 rawId, type, uniqueId 결정
     * 2. `TreeNode` 객체 생성 및 Map 등록
     * 3. 부모의 `childrenIds`에 추가
     * 4. `columns.children` 재귀 처리 (동종 하위 계층)
     * 5. `columns.extraItems` → `_parseExtraItems()` 처리 (이종 병렬 계층)
     *
     * @param {Object[]}        dataList      파싱할 원본 데이터 배열
     * @param {string|null}     [parentId]    부모 노드의 `id`. 최상위이면 `null`
     * @param {string[]}        [pathStack]   상위 노드명을 순서대로 담은 경로 스택
     * @param {Map<*, boolean>} [checkSnapshot]
     *   `lazyReload` 시 전달되는 `rawId → isChecked` 스냅샷.
     *   존재하면 스냅샷 값을 우선 복원하고, 없으면 부모 체크 상태를 상속합니다.
     * @returns {void}
     */
    const _parseData = (dataList, parentId = null, pathStack = [], checkSnapshot = undefined) => {
        const cols = opt.columns;

        dataList.forEach(item => {
            const rawId      = typeof cols.id   === 'function' ? cols.id(item)   : item[cols.id];
            const type       = typeof cols.type === 'function' ? cols.type(item) : item[cols.type];
            const uniqueId   = `${type}:${rawId}`;
            const currentPath = pathStack.join(' > ');

            const parentChecked   = !!(parentId && nodes.get(parentId)?.isChecked);
            const snapshotChecked = checkSnapshot?.has(rawId) ? checkSnapshot.get(rawId) : null;
            const initialChecked  = snapshotChecked !== null ? snapshotChecked : parentChecked;

            /** @type {TreeNode} */
            const node = {
                id:              uniqueId,
                rawId,
                name:            item[cols.name],
                type,
                subText:         item[cols.subText] || '',
                fullPath:        currentPath,
                parentId,
                childrenIds:     [],
                isChecked:       initialChecked,
                isIndeterminate: false,
                isExpanded:      false,
                isLoading:       false,
                isLoaded:        false,
                raw:             item,
                customIcon:      item[cols.icon] || null,
            };

            nodes.set(uniqueId, node);
            if (parentId && nodes.has(parentId)) {
                nodes.get(parentId).childrenIds.push(uniqueId);
            }

            // 동종 하위 계층 재귀 (하위 부서, 하위 폴더 등)
            const children = item[cols.children];
            if (children && children.length > 0) {
                _parseData(children, uniqueId, [...pathStack, node.name], checkSnapshot);
            }

            // 이종 병렬 계층 (사원 목록, 파일 목록 등)
            // parseData 재귀를 쓰면 멤버 객체에서 children/extraItems를 재탐색해
            // 타입 판별이 엉키고 uniqueId 충돌이 발생하므로 전용 파서를 사용합니다.
            const extras = item[cols.extraItems];
            if (extras && extras.length > 0) {
                _parseExtraItems(extras, uniqueId, [...pathStack, node.name], checkSnapshot);
            }
        });
    };

    /**
     * extraItems(사원 목록 등 이종 병렬 항목)를 단독 리프 노드로 등록합니다.
     *
     * `_parseData()`와의 차이점:
     * - uniqueId에 `@{parentId}` suffix를 붙여 다른 부서의 동일 멤버와 충돌을 방지합니다.
     *   (예: `"file:42@folder:DEPT01"`, `"file:42@folder:DEPT03"`)
     * - 같은 부서 내에서도 rawId가 충돌하면 `_1`, `_2` suffix를 추가로 붙입니다.
     * - extraItem 자신이 `children`/`extraItems`를 가지면 재귀 처리합니다.
     *
     * @param {Object[]}        items         등록할 이종 항목 배열
     * @param {string}          parentId      부모 노드의 `id`
     * @param {string[]}        pathStack     상위 노드명 경로 스택
     * @param {Map<*, boolean>} [checkSnapshot] `rawId → isChecked` 스냅샷
     * @returns {void}
     */
    const _parseExtraItems = (items, parentId, pathStack, checkSnapshot) => {
        const cols        = opt.columns;
        const currentPath = pathStack.join(' > ');

        items.forEach(item => {
            const rawId    = typeof cols.id   === 'function' ? cols.id(item)   : item[cols.id];
            const type     = typeof cols.type === 'function' ? cols.type(item) : item[cols.type];

            // parentId suffix로 다른 부서의 동일 멤버와 충돌 방지
            const baseId   = `${type}:${rawId}@${parentId}`;

            const parentChecked   = !!(parentId && nodes.get(parentId)?.isChecked);
            // 스냅샷 복원은 suffix 없는 rawId 기준으로 조회합니다
            const snapshotChecked = checkSnapshot?.has(rawId) ? checkSnapshot.get(rawId) : null;
            const initialChecked  = snapshotChecked !== null ? snapshotChecked : parentChecked;

            /** @type {TreeNode} */
            const node = {
                id:              baseId, // 아래에서 충돌 시 finalId로 교체됩니다
                rawId,
                name:            item[cols.name],
                type,
                subText:         item[cols.subText] || '',
                fullPath:        currentPath,
                parentId,
                childrenIds:     [],
                isChecked:       initialChecked,
                isIndeterminate: false,
                isExpanded:      false,
                isLoading:       false,
                isLoaded:        false,
                raw:             item,
                customIcon:      item[cols.icon] || null,
            };

            // 같은 부서 내 rawId 충돌 방어 (_1, _2, ... suffix 추가)
            let finalId = baseId;
            let sfx = 0;
            while (nodes.has(finalId)) { finalId = `${baseId}_${++sfx}`; }
            node.id = finalId;

            nodes.set(finalId, node);
            if (nodes.has(parentId)) {
                nodes.get(parentId).childrenIds.push(finalId);
            }

            // extraItem 자신도 children / extraItems를 가지는 경우 재귀 처리
            const children = item[cols.children];
            if (children && children.length > 0) {
                _parseData(children, finalId, [...pathStack, node.name], checkSnapshot);
            }
            const extras = item[cols.extraItems];
            if (extras && extras.length > 0) {
                _parseExtraItems(extras, finalId, [...pathStack, node.name], checkSnapshot);
            }
        });
    };

    // =========================================================================
    // 렌더링
    // =========================================================================

    /**
     * 전체 트리를 (재)렌더링합니다.
     *
     * - 검색 모드(`isSearching === true`)이면 즉시 반환합니다.
     *   검색 화면은 `_renderSearchList()`가 단독 관리합니다.
     * - 최상위 노드(`parentId === null`)부터 시작하여 `_buildNodeHtml()`을 재귀 호출합니다.
     * - 렌더링 완료 후 `_syncIndeterminateDOM()`으로 indeterminate 상태를 DOM에 동기화합니다.
     *
     * @returns {void}
     */
    const _render = () => {
        if (!container) return;
        if (isSearching) return;

        const rootNodes = Array.from(nodes.values()).filter(n => n.parentId === null);

        if (rootNodes.length === 0) {
            container.innerHTML = _buildEmptyHtml();
        } else {
            let html = '<div class="tree-root tree-menu-root w-100">';
            rootNodes.forEach(node => { html += _buildNodeHtml(node); });
            html += '</div>';
            container.innerHTML = html;
        }
        _syncIndeterminateDOM();
    };

    /**
     * 빈 목록 안내 HTML을 반환합니다.
     *
     * - `opt.emptyMessage`가 있으면 그 값을 사용합니다.
     * - 없으면 `opt.sendModalMode`에 따라 분기합니다.
     *   - `true`: "현재 폴더에 하위 폴더가 없습니다."
     *   - `false`: "비어있습니다."
     *
     * @returns {string} 빈 목록 HTML 문자열
     */
    const _buildEmptyHtml = () => {
        const msg = opt.emptyMessage
            || (opt.sendModalMode ? '현재 폴더에 하위 폴더가 없습니다.' : '비어있습니다.');
        return `
        <div class="file-item-container w-100">
            <div class="tree-menu-nav-link">
                <div class="d-flex align-items-center flex-grow-1">
                    <small class="tree-menu-empty">${msg}</small>
                </div>
            </div>
        </div>`;
    };

    /**
     * 단일 노드(및 펼쳐진 경우 자손들)의 HTML 문자열을 재귀적으로 생성합니다.
     *
     * 렌더링 구조 (기존 folderTree.jte / renderOrgNode와 동일):
     * ```
     * ┌─────────────────────────────────────────────────────────┐
     * │ [toggle 20px] [checkbox] [icon] [name] [subText]        │
     * │   └─ <nav.tree-menu-children>                           │
     * │         └─ 자식 노드들 (재귀)                            │
     * └─────────────────────────────────────────────────────────┘
     * ```
     *
     * 아이콘 결정 우선순위:
     * - 토글: 로딩 중 → 스피너 | 자식 있음 → chevron | 없음 → bi-dot(#dee2e6)
     * - 콘텐츠: customIcon > 포커스된 폴더(bi-folder2-open text-primary) > 기본
     *
     * @param {TreeNode} node 렌더링할 노드
     * @returns {string} 해당 노드와 자손을 포함한 HTML 문자열
     */
    const _buildNodeHtml = (node) => {
        const isFolder  = node.type === 'folder';
        const isFocused = focusedNodeId === node.id;

        // lazyReload=true인 폴더는 isLoaded가 항상 false이므로 항상 토글 아이콘 표시
        const hasChildren = node.childrenIds.length > 0
            || (isFolder && opt.lazyLoad && !node.isLoaded);

        // ── 토글 아이콘 ────────────────────────────────────────────────────
        let toggleHtml;
        if (node.isLoading) {
            toggleHtml = `<i class="bi ${opt.icons.loading} tree-menu-spin" style="font-size:0.8rem;"></i>`;
        } else if (node.type === 'folder' || hasChildren) {
            const chevron = node.isExpanded ? opt.icons.collapse : opt.icons.expand;
            toggleHtml = `<i class="bi ${chevron} tree-menu-cursor" style="font-size:0.8rem;"></i>`;
        } else {
            // 파일(말단 노드)인 경우에만 bi-dot 표시
            toggleHtml = `<i class="bi bi-dot" style="font-size:0.9rem;color:#dee2e6;"></i>`;
        }

        // ── 콘텐츠 아이콘 ──────────────────────────────────────────────────
        let iconClass;
        if (node.customIcon) {
            iconClass = node.customIcon;
        } else if (isFolder) {
            iconClass = isFocused
                ? 'bi-folder2-open text-primary'
                : (node.isExpanded ? opt.icons.folderOpen : opt.icons.folderClose);
        } else {
            iconClass = isFocused ? `${opt.icons.file} text-primary` : opt.icons.file;
        }

        // ── 텍스트 클래스 ──────────────────────────────────────────────────
        // 폴더: fw-bold text-dark | 파일: text-dark | 포커스: text-primary fw-bold
        const nameClass = isFocused
            ? 'text-nowrap text-primary fw-bold'
            : (isFolder ? 'text-nowrap fw-bold text-dark' : 'text-nowrap text-dark');

        // ── 체크박스 ────────────────────
        const safeId = node.id.replace(/[^a-zA-Z0-9_-]/g, '-');
        const checkboxHtml = opt.showCheckbox ? `
            <div class="form-check mb-0">
                <label class="form-check-label" for="chk-${safeId}"></label>
                <input type="checkbox"
                       class="form-check-input tree-checkbox"
                       id="chk-${safeId}"
                       ${node.isChecked ? 'checked' : ''}>
            </div>` : '';

        // ── 자식 컨테이너 (기존 border-start + ms-4 ps-2 재현) ────────────
        let childrenHtml = '';
        if (isFolder && node.isExpanded) {
            if (node.childrenIds.length > 0) {
                childrenHtml = `<nav class="nav flex-column tree-menu-children tree-menu-root">`;
                node.childrenIds.forEach(cid => {
                    const child = nodes.get(cid);
                    if (child) childrenHtml += _buildNodeHtml(child);
                });
                childrenHtml += `</nav>`;
            } else if (!node.isLoading && node.isLoaded) {
                // lazyLoad 후 빈 결과
                childrenHtml = `<nav class="nav flex-column tree-menu-children">${_buildEmptyHtml()}</nav>`;
            }
        }

        return `
        <div class="file-item-container py-1 w-100" data-id="${node.id}">
            <div class="tree-menu-nav-link${isFocused ? ' is-focused' : ''}">
                <div class="me-1 toggle-btn d-flex justify-content-center align-items-center"
                     style="width:20px;flex-shrink:0;">
                    ${toggleHtml}
                </div>
                ${checkboxHtml}
                <div class="d-flex align-items-center flex-grow-1 node-content tree-menu-cursor overflow-hidden">
                    <i class="bi ${iconClass} me-2" style="font-size:1rem;flex-shrink:0;"></i>
                    <span class="${nameClass}">${node.name}</span>
                    ${node.subText ? `<small class="text-muted ms-1">${node.subText}</small>` : ''}
                </div>
            </div>
            ${childrenHtml}
        </div>`;
    };

    // =========================================================================
    // 이벤트 처리
    // =========================================================================

    /**
     * 컨테이너에 클릭 이벤트를 이벤트 위임 방식으로 단일 등록합니다.
     *
     * 이벤트 위임을 사용하므로 innerHTML 교체 후에도 재등록이 불필요합니다.
     * `_init()` 호출 시 한 번만 실행되며, `setData()` 재초기화 시에는 호출하지 않습니다.
     *
     * 클릭 타겟 분류:
     * - `.toggle-btn` 내부 → `toggleNode()` (폴더만)
     * - `.tree-checkbox`  → `setCheck()`
     * - `.node-content`   → 포커스 설정 + `onClick` 콜백
     *
     * @returns {void}
     */
    const _setupEvents = () => {
        if (!container) return;
        // init() 재호출 시 중복 등록 방지
        if (container._treeMenuBound) return;
        container._treeMenuBound = true;

        container.addEventListener('click', async (e) => {
            const nodeEl = e.target.closest('[data-id]');
            if (!nodeEl) return;

            const node = nodes.get(nodeEl.dataset.id);
            if (!node) return;

            if (e.target.closest('.toggle-btn')) {
                e.stopPropagation();
                if (node.type === 'folder') await toggleNode(node);

            } else if (e.target.classList.contains('tree-checkbox')) {
                e.stopPropagation();
                setCheck(node, e.target.checked);

            } else if (e.target.closest('.node-content')) {
                focusedNodeId = node.id;
                opt.onClick(node.raw);
                isSearching
                    ? _renderSearchList(lastResults || [], lastTerm || '')
                    : _render();
            }
        });
    };

    // =========================================================================
    // 노드 토글 (펼치기 / 접기)
    // =========================================================================

    /**
     * 폴더 노드를 펼치거나 접습니다.
     *
     * 접기: `isExpanded = false` 후 재렌더링.
     *
     * 펼치기 — `lazyLoad: false`: 이미 파싱된 자식을 즉시 표시합니다.
     *
     * 펼치기 — `lazyLoad: true, lazyReload: false`:
     *   `isLoaded === false`인 경우에만 `onLazyLoad`를 호출합니다.
     *   이후 재펼침 시에는 캐시된 자식을 재사용합니다.
     *
     * 펼치기 — `lazyLoad: true, lazyReload: true`:
     *   펼칠 때마다 아래 순서로 동작합니다.
     *   1. `_collectCheckSnapshot()`으로 기존 자손의 체크 스냅샷 생성
     *   2. `_purgeDescendants()`로 기존 자손 즉시 제거 (스피너만 표시)
     *   3. `isLoading = true` 렌더링
     *   4. `onLazyLoad` 응답 후 스냅샷을 전달하여 체크 상태 복원
     *   5. `isLoaded = false` 유지 (다음 펼침 시 재로드 보장)
     *
     * @param {TreeNode} node 토글할 폴더 노드
     * @returns {Promise<void>}
     */
    const toggleNode = async (node) => {
        if (node.isExpanded) {
            node.isExpanded = false;
            _render();
            return;
        }

        const needsLoad = opt.lazyLoad && (opt.lazyReload || !node.isLoaded);

        if (needsLoad) {
            const checkSnapshot = opt.lazyReload ? _collectCheckSnapshot(node) : undefined;

            if (opt.lazyReload) _purgeDescendants(node);

            node.isLoading  = true;
            node.isExpanded = true;
            _render(); // 스피너 표시

            const children = await opt.onLazyLoad(node.raw);
            const pathParts = node.fullPath ? node.fullPath.split(' > ') : [];
            _parseData(children, node.id, [...pathParts, node.name], checkSnapshot);

            node.isLoading = false;
            node.isLoaded  = !opt.lazyReload;

            // 최초 로드이고 부모가 체크 상태이면 자손에 cascade 전파
            if (node.isChecked && !checkSnapshot) _cascadeDown(node, true);
            if (opt.lazyReload) _cascadeUp(node.parentId);
        }

        node.isExpanded = true;
        _render();
    };

    // =========================================================================
    // Lazy Reload 보조 메서드
    // =========================================================================

    /**
     * 지정 노드의 모든 자손에 대해 `rawId → isChecked` 스냅샷 맵을 생성합니다.
     *
     * `_purgeDescendants()` 호출 직전에 실행하여 체크 상태를 보존합니다.
     * 새로 파싱된 동일 `rawId` 노드에 이전 체크 상태를 복원하는 데 사용됩니다.
     *
     * @param {TreeNode} node 스냅샷을 수집할 부모 노드 (자신은 포함하지 않음)
     * @returns {Map<*, boolean>} `rawId → isChecked` 맵
     */
    const _collectCheckSnapshot = (node) => {
        const snapshot = new Map();
        const collect  = (n) => {
            n.childrenIds.forEach(cid => {
                const child = nodes.get(cid);
                if (!child) return;
                snapshot.set(child.rawId, child.isChecked);
                collect(child);
            });
        };
        collect(node);
        return snapshot;
    };

    /**
     * 지정 노드의 모든 자손을 내부 노드 맵에서 재귀적으로 제거합니다.
     *
     * `lazyReload` 시 새 데이터를 파싱하기 직전에 호출하여 오래된 노드 잔류를 방지합니다.
     * 제거 대상 중 `focusedNodeId`와 일치하는 것이 있으면 포커스도 함께 해제합니다.
     *
     * @param {TreeNode} node 자손을 제거할 부모 노드 (자신은 제거하지 않음)
     * @returns {void}
     */
    const _purgeDescendants = (node) => {
        const purge = (n) => {
            n.childrenIds.forEach(cid => {
                const child = nodes.get(cid);
                if (!child) return;
                purge(child);
                if (focusedNodeId === child.id) focusedNodeId = null;
                nodes.delete(cid);
            });
        };
        purge(node);
        node.childrenIds = [];
    };

    // =========================================================================
    // 체크 상태 관리
    // =========================================================================

    /**
     * 특정 노드의 체크 상태를 설정하고 cascade 로직을 수행합니다.
     *
     * `cascadeCheck: true`이면:
     * - `_cascadeDown()`: 모든 자손에 동일 체크 상태 전파
     * - `_cascadeUp()`: 루트까지 checked / indeterminate 상태 재계산
     *
     * 상태 변경 후 화면을 갱신하고 `onCheckChange` 콜백을 호출합니다.
     *
     * @param {TreeNode} node      체크 상태를 변경할 노드
     * @param {boolean}  isChecked 설정할 체크 상태
     * @returns {void}
     */
    const setCheck = (node, isChecked) => {
        node.isChecked       = isChecked;
        node.isIndeterminate = false;

        if (opt.cascadeCheck) {
            _cascadeDown(node, isChecked);
            _cascadeUp(node.parentId);
        }

        isSearching
            ? _renderSearchList(lastResults, lastTerm)
            : _render();

        opt.onCheckChange(getSelectedFolders(), getSelectedFiles());
    };

    /**
     * 지정 노드의 모든 자손에 체크 상태를 재귀적으로 전파합니다.
     *
     * @param {TreeNode} node      전파 시작 노드 (자신은 이미 변경된 상태)
     * @param {boolean}  isChecked 전파할 체크 상태
     * @returns {void}
     */
    const _cascadeDown = (node, isChecked) => {
        node.childrenIds.forEach(cid => {
            const child = nodes.get(cid);
            if (child) {
                child.isChecked       = isChecked;
                child.isIndeterminate = false;
                _cascadeDown(child, isChecked);
            }
        });
    };

    /**
     * 지정 노드부터 루트까지 올라가며 각 조상의 체크/indeterminate 상태를 재계산합니다.
     *
     * 계산 규칙:
     * - 자식 전부 체크됨      → `checked = true`,  `indeterminate = false`
     * - 자식 하나도 체크 안 됨 → `checked = false`, `indeterminate = false`
     * - 자식 일부만 체크됨     → `checked = false`, `indeterminate = true`
     *
     * @param {string|null} parentId 재계산을 시작할 부모 노드의 `id`. `null`이면 즉시 반환
     * @returns {void}
     */
    const _cascadeUp = (parentId) => {
        if (!parentId) return;
        const parent = nodes.get(parentId);
        if (!parent) return;

        const children   = parent.childrenIds.map(cid => nodes.get(cid)).filter(Boolean);
        const allChecked = children.every(c => c.isChecked);
        const anyChecked = children.some(c => c.isChecked || c.isIndeterminate);

        parent.isChecked       = allChecked;
        parent.isIndeterminate = !allChecked && anyChecked;

        _cascadeUp(parent.parentId);
    };

    /**
     * 렌더링된 체크박스 DOM 엘리먼트의 `indeterminate` 프로퍼티를 노드 상태와 동기화합니다.
     *
     * `indeterminate`는 HTML attribute로 표현할 수 없어 반드시 JS로 직접 설정해야 합니다.
     * `innerHTML` 교체 후 매번 호출됩니다.
     *
     * @returns {void}
     */
    const _syncIndeterminateDOM = () => {
        nodes.forEach(node => {
            const safeId = node.id.replace(/[^a-zA-Z0-9_-]/g, '-');
            const el = document.getElementById(`chk-${safeId}`);
            if (el) el.indeterminate = node.isIndeterminate;
        });
    };

    // =========================================================================
    // 검색
    // =========================================================================

    /**
     * 키워드로 노드를 필터링하여 리스트 뷰로 표시합니다.
     *
     * 검색 대상: `name + fullPath + subText`를 공백으로 연결한 문자열에서
     * 대소문자 무시 부분 일치를 수행합니다.
     *
     * - 빈 키워드이면 검색 모드를 해제하고 일반 트리 뷰로 복귀합니다.
     * - 검색 결과는 `lastResults` / `lastTerm`에 캐시되어
     *   검색 중 체크 상태 변경 후 재렌더링에 활용됩니다.
     *
     * @param {string} keyword 검색 키워드. 공백만 있거나 빈 문자열이면 검색 해제
     * @returns {void}
     */
    const search = (keyword) => {
        const term = keyword ? keyword.trim().toLowerCase() : '';
        lastTerm   = term;

        if (!term) {
            isSearching = false;
            _render();
            return;
        }

        isSearching = true;

        const results = [];
        nodes.forEach(node => {
            const blob = `${node.name} ${node.fullPath} ${node.subText}`.toLowerCase();
            if (blob.includes(term)) results.push(node);
        });

        lastResults = results;
        _renderSearchList(results, term);
    };

    /**
     * 검색 결과를 리스트 형태로 렌더링합니다.
     *
     * 기존 `SendAction.renderSearchResultNode()`와 동일한 레이아웃:
     * - 체크박스 | 아이콘 + 이름 + 보조텍스트 | 경로(bi-arrow-return-right)
     *
     * - 결과 없음: 안내 메시지를 표시합니다.
     * - 결과 있음: 검색 키워드를 `<mark>`로 하이라이팅합니다.
     * - 포커스 노드는 왼쪽 테두리와 배경으로 구별합니다.
     *
     * @param {TreeNode[]} results 표시할 노드 배열
     * @param {string}     term    하이라이팅에 사용할 검색어 (소문자)
     * @returns {void}
     */
    const _renderSearchList = (results, term) => {
        if (!results || results.length === 0) {
            container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-search text-light mb-2" style="font-size:2rem;"></i>
                <p class="text-muted small">검색 결과가 없습니다.</p>
            </div>`;
            return;
        }

        const regex     = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const highlight = (txt) => String(txt).replace(regex, '<mark class="tree-menu-highlight p-0">$1</mark>');

        let html = '<div class="tree-menu-root">';

        results.forEach(node => {
            const isFolder  = node.type === 'folder';
            const isFocused = focusedNodeId === node.id;
            const icon      = node.customIcon || (isFolder ? opt.icons.folderClose : opt.icons.file);
            const safeId    = node.id.replace(/[^a-zA-Z0-9_-]/g, '-');
            const itemClass = `tree-menu-search-item border-bottom py-2 px-1${isFocused ? ' is-focused' : ''}`;

            const checkboxHtml = opt.showCheckbox ? `
            <div class="form-check mb-0">
                <label class="form-check-label" for="chk-${safeId}"></label>
                <input type="checkbox"
                       class="form-check-input tree-checkbox"
                       id="chk-${safeId}"
                       ${node.isChecked ? 'checked' : ''}>
            </div>` : '';

            html += `
            <div class="${itemClass}" data-id="${node.id}">
                <div class="d-flex align-items-center">
                    ${checkboxHtml}
                    <div class="flex-grow-1 node-content tree-menu-cursor overflow-hidden">
                        <div class="d-flex align-items-center">
                            <i class="bi ${icon} me-2"></i>
                            <span class="${isFolder ? 'fw-bold text-dark' : 'text-dark'}">${highlight(node.name)}</span>
                            ${node.subText ? `<small class="text-muted ms-1">${highlight(node.subText)}</small>` : ''}
                        </div>
                        <div class="text-muted small align-items-center" style="font-size:0.75rem;">
                            <i class="bi bi-arrow-return-right my-1 me-2 text-light"></i>
                            <span>${highlight(node.fullPath || '최상위')}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        });

        html += '</div>';
        container.innerHTML = html;
        _syncIndeterminateDOM();
    };

    // =========================================================================
    // 공개 조회 API
    // =========================================================================

    /**
     * 현재 체크된 모든 폴더 노드의 원본 데이터 배열을 반환합니다.
     *
     * @returns {Object[]} 체크된 폴더 노드의 `raw` 데이터 배열 (빈 배열 가능)
     */
    const getSelectedFolders = () =>
        Array.from(nodes.values())
            .filter(n => n.type === 'folder' && n.isChecked)
            .map(n => n.raw);

    /**
     * 현재 체크된 모든 파일(말단) 노드의 원본 데이터 배열을 반환합니다.
     *
     * extraItems로 등록된 노드는 같은 멤버가 여러 부서에서 각각 독립 노드로 존재합니다.
     * 두 부서 모두 체크된 경우 중복 반환을 방지하기 위해 `rawId` 기준으로 중복을 제거합니다.
     *
     * @returns {Object[]} 체크된 파일 노드의 `raw` 데이터 배열 (rawId 기준 중복 제거됨)
     */
    const getSelectedFiles = () => {
        const seen = new Set();
        return Array.from(nodes.values())
            .filter(n => n.type === 'file' && n.isChecked)
            .filter(n => {
                if (seen.has(n.rawId)) return false;
                seen.add(n.rawId);
                return true;
            })
            .map(n => n.raw);
    };

    /**
     * 선택된 파일 목록 데이터 배열 반환 (폴더 + 파일)
     * @returns {Object[]} 통합된 데이터 배열
     */
    const getSelectedAll = () => {
        return getSelectedFolders().concat(getSelectedFiles());
    }

    // =========================================================================
    // 공개 제어 API
    // =========================================================================

    /**
     * 트리 데이터를 새 데이터로 교체하고 재초기화합니다.
     *
     * 이전 상태(체크, 포커스, 검색)는 모두 초기화됩니다.
     * 이벤트 리스너는 `_setupEvents()` 내부의 중복 방지 플래그(`_treeMenuBound`)로
     * 재등록되지 않습니다.
     *
     * @param {Object[]} newData 새 트리 데이터 배열
     * @returns {void}
     */
    const setData = (newData) => {
        opt.data = newData;
        _init();
    };

    /**
     * 컨테이너 HTML을 비우고 내부 노드 맵 및 상태를 초기화합니다.
     *
     * 컨테이너가 DOM에서 제거되거나 다른 컴포넌트로 교체될 때 호출합니다.
     *
     * @returns {void}
     */
    const destroy = () => {
        if (container) container.innerHTML = '';
        nodes.clear();
        focusedNodeId = null;
        isSearching   = false;
        lastResults   = null;
        lastTerm      = null;
        if (container) delete container._treeMenuBound;
    };

    // =========================================================================
    // 초기 실행
    // =========================================================================

    _injectStyles();
    _init();

    // =========================================================================
    // 공개 API 반환
    // =========================================================================

    /** @type {TreeMenuInstance} */
    return {
        search,  // 검색
        setData, // 새 데이터 세팅
        destroy, // 완전 초기화

        getSelectedFolders, // 선택된 폴더 리스트
        getSelectedFiles,   // 선택된 파일 리스트
        getSelectedAll,     // 선택된 전체 리스트

        setCheck,   // 체크 상태 전파
        toggleNode, // 토글 관리
    };
};