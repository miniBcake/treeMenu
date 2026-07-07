/**
 * @fileoverview Bootstrap 5 & Bootstrap Icons 기반 범용 트리 메뉴 컴포넌트
 *
 * 조직도(부서/사원), 파일 시스템(폴더/파일), 카테고리 계층 등
 * 다양한 계층형 데이터를 동일한 인터페이스로 표현합니다.
 *
 * @module TreeMenu
 * @requires Bootstrap 5 (CSS + JS)
 * @requires Bootstrap Icons
 * @version 1.5.4
 *
 * @example
 * // 조직도 트리
 * const orgTree = TreeMenu('#send-org-tree-nav', {
 * data: orgData,
 * columns: {
 * id:         (item) => item.code || item.id,
 * type:       (item) => item.code ? 'folder' : 'file',
 * extraItems: 'memberList',
 * subText:    'position_name',
 * },
 * icons: {
 * folderClose: 'bi-collection-fill text-primary',
 * folderOpen:  'bi-collection-fill text-primary',
 * file:        'bi-person-fill text-muted',
 * },
 * onCheckChange: (folders, files) => {
 * console.log('선택된 부서:', folders);
 * console.log('선택된 사원:', files);
 * },
 * });
 */

/**
 * @typedef {Object} TreeMenuColumns
 * @property {string|function(Object):string} [id='id'] 고유식별자 필드명 또는 추출 함수
 * @property {string} [name='name'] 노드명 필드명
 * @property {string|function(Object):string} [type='type'] 노드 타입 ('folder' | 'file') 추출명 또는 함수
 * @property {string} [children='children'] 표준 자식 배열 필드명
 * @property {string} [extraItems='extraItems'] 추가 교차 매핑 자식 배열 필드명 (예: 부서 내 사원목록)
 * @property {string} [subText='subText'] 우측 보조 텍스트 필드명
 * @property {string} [icon='icon'] 노드별 개별 커스텀 아이콘 필드명
 */

/**
 * @typedef {Object} TreeMenuIcons
 * @property {string} [folderClose='bi-folder-fill text-warning'] 닫힌 폴더 아이콘 클래스
 * @property {string} [folderOpen='bi-folder2-open text-warning'] 열린 폴더 아이콘 클래스
 * @property {string} [file='bi-file-earmark text-secondary'] 파일 아이콘 클래스
 * @property {string} [expand='bi-chevron-right'] 확장 화살표 아이콘 클래스
 * @property {string} [collapse='bi-chevron-down'] 축소 화살표 아이콘 클래스
 * @property {string} [loading='bi-hourglass-split'] 지연 로딩 스피너 아이콘 클래스
 */

/**
 * @typedef {Object} TreeMenuOptions
 * @property {Object[]} [data=[]] 초기 트리 원본 데이터 배열
 * @property {boolean} [addClickCSS=true] 노드 텍스트 클릭 시 하이라이트 CSS 적용 여부
 * @property {boolean} [showCheckbox=true] 체크박스/라디오 등 선택기 표시 여부 (보관용, 현재는 selectorType으로 제어)
 * @property {'checkbox'|'radio'|'none'} [selectorType='checkbox'] 노드 좌측 선택 컨트롤의 종류
 * @property {function(Object, Object):boolean} [selectorVisible=()=>true] 특정 데이터 노드에 선택기를 노출할지 여부 조건 함수 (raw, node 입력)
 * @property {string|null} [selectorName=null] 라디오 버튼 적용 시 그룹핑할 name 속성값 (미지정 시 무작위 생성)
 * @property {boolean} [cascadeCheck=true] 체크박스 선택 시 상하위 노드 연동(전파) 여부
 * @property {boolean} [expandOnClick=true] 폴더 영역 클릭 시 폴더 개폐(토글) 여부
 * @property {boolean} [allowFolderToggleOnLabelClick=true] 폴더 라벨(텍스트) 영역 클릭 시에도 개폐 동작 수행 여부
 * @property {boolean} [lazyLoad=false] 하위 노드를 필요한 시점에 비동기로 동적 로딩할지 여부
 * @property {boolean} [lazyReload=false] 이미 로드된 폴더를 다시 열 때 데이터를 재생성/새로고침할지 여부
 * @property {boolean} [showEmptyMsg=true] 하위 데이터가 없는 경우 '비어있습니다' 메시지 출력 여부
 * @property {string|null} [emptyMessage=null] 커스텀 빈 데이터 메시지
 * @property {function(Object):Promise<Object[]>} [onLazyLoad=async ()=>[]] 지연 로딩 수행 시 데이터를 호출할 비동기 핸들러 함수
 * @property {function(Object[], Object[]):void} [onCheckChange=()=>{}] 선택된 폴더/파일 배열이 변경될 때의 콜백 핸들러
 * @property {function(Object):void} [onClick=()=>{}] 노드 콘텐츠(라벨)를 최종 클릭(포커스)했을 때의 콜백 핸들러
 * @property {TreeMenuIcons} [icons] 아이콘 클래스 오버라이드 설정
 * @property {TreeMenuColumns} [columns] 데이터 맵핑 컬럼 명세 설정
 */

/**
 * @typedef {Object} TreeMenuInstance
 * @property {function(string):void} search 키워드를 기반으로 트리를 실시간 필터 검색 모드로 전환
 * @property {function(Object[]):void} setData 트리에 새로운 데이터 세트를 바인딩하고 재초기화
 * @property {function():void} destroy 컨테이너 내부를 비우고 상태 메모리를 완전 삭제
 * @property {function():Object[]} getSelectedFolders 체크 처리된 폴더들의 원본 데이터 배열 반환
 * @property {function():Object[]} getSelectedFiles 체크 처리된 파일들의 원본 데이터 배열 반환 (중복 제거 포함)
 * @property {function():Object[]} getSelectedAll 체크 처리된 모든 노드의 원본 데이터 배열 반환
 * @property {function(Object, boolean):void} setCheck 프로그램 방식으로 특정 노드의 체크 상태를 변경 및 전파
 * @property {function(Object):Promise<void>} toggleNode 특정 폴더 노드의 확장/축소 상태를 토글 전환
 * @property {function(string):Promise<void>} openPath '폴더 > 하위폴더 > 파일' 형태의 경로 텍스트 문자열을 추적하여 순차 확장 및 포커스
 * @property {function(number=):Promise<void>} expandAll 트리 내 모든 폴더 노드를 지정 깊이까지 일괄 확장 (LazyLoad 지원)
 * @property {function():void} collapseAll 트리 내 모든 폴더 노드를 일괄 축소
 */

/**
 * 범용 트리 메뉴 인스턴스를 생성합니다.
 * @param {string|HTMLElement} selector 대상을 지정할 CSS 선택자 문자열 또는 HTMLElement 객체
 * @param {TreeMenuOptions} [options={}] 설정 옵션 오버라이드 객체
 * @returns {TreeMenuInstance} 제어 기능을 포함한 TreeMenu 공개 API 인터페이스 객체
 */
const TreeMenu = (selector, options = {}) => {
    // =========================================================================
    // 상수 및 내부 상태 관리
    // =========================================================================
    const PATH_SEPARATOR = ' > ';

    /** * 트리가 렌더링될 대상 DOM 엘리먼트
     * @type {HTMLElement}
     */
    const container = typeof selector === 'string' ? document.querySelector(selector) : selector;

    /** * 트리 전체 노드의 상태 정보를 캐싱하는 고유 맵
     * @type {Map<string, Object>}
     */
    const nodes = new Map();

    let isSearching = false;   // 현재 검색 결과 리스트 모드 활성화 여부
    let focusedNodeId = null;   // 마우스 클릭으로 선택/포커스된 노드의 uniqueId
    let lastResults = null;     // 최근 검색 결과 노드 리스트 백업
    let lastTerm = null;        // 최근 검색어 백업

    // 아이콘 기본 테마 명세
    const defaultIcons = {
        folderClose:   'bi-folder-fill text-warning',
        folderOpen:    'bi-folder2-open text-warning',
        file:          'bi-file-earmark text-secondary',
        expand:        'bi-chevron-right',
        collapse:      'bi-chevron-down',
        loading:       'bi-hourglass-split',
    };

    // 데이터 바인딩용 컬럼 키 기본 매핑값
    const defaultColumns = {
        id:         'id',
        name:       'name',
        type:       'type',
        children:   'children',
        extraItems: 'extraItems',
        subText:    'subText',
        icon:       'icon',
    };

    /** * 런타임에 최종 사용되는 설정 옵션 샌드박스
     * @type {TreeMenuOptions}
     */
    const opt = {
        data:           [],
        addClickCSS:    true,
        showCheckbox:   true,
        selectorType:   undefined,
        selectorVisible: () => true,
        selectorName:   null,
        cascadeCheck:   true,
        expandOnClick:  true,
        allowFolderToggleOnLabelClick: true,
        lazyLoad:       false,
        lazyReload:     false,
        showEmptyMsg:   true,
        emptyMessage:   null,
        onLazyLoad:     async () => [],
        onCheckChange:  () => {},
        onClick:        () => {},
        ...options,
        icons:   { ...defaultIcons,   ...(options.icons   || {}) },
        columns: { ...defaultColumns, ...(options.columns || {}) },
    };

    // selectorType 하위 호환성 보정 및 유니크 라디오 그룹 네임스페이스 생성
    opt.selectorType = opt.selectorType || (opt.showCheckbox === false ? 'none' : 'checkbox');
    const selectorName = opt.selectorName || `tree-selector-${Math.random().toString(36).slice(2)}`;

    // =========================================================================
    // 내부 공통 스타일 인젝션
    // =========================================================================
    /**
     * 트리에 필요한 핵심 스타일 레이아웃을 전역 브라우저 헤더에 동적 삽입합니다.
     * @private
     */
    const _injectStyles = () => {
        if (document.getElementById('tree-menu-style')) return;
        const style = document.createElement('style');
        style.id = 'tree-menu-style';
        style.textContent = `
            .tree-menu-nav-link { padding: 0.25rem 0.5rem; cursor: pointer; display: flex; align-items: center; border: 0; border-radius: 0.25rem; text-decoration: none; color: inherit; }
            .tree-menu-nav-link:hover { background-color: rgba(78,115,223,0.05); }
            .tree-menu-nav-link.is-focused { background-color: rgba(78,115,223,0.08); }
            .tree-menu-cursor { cursor: pointer; }
            .tree-menu-children { margin-left: 1rem; padding-left: 0.5rem; border-left: 1px solid #f0f0f0; }
            .tree-menu-empty { color: #c6c7c8; font-size: 0.85rem; }
            .tree-menu-search-item:hover { background-color: rgba(78,115,223,0.04); }
            .tree-menu-search-item.is-focused { border-left: 3px solid #4e73df !important; background-color: #f8f9fa; }
            .tree-menu-highlight { background-color: #fff3cd; padding: 0; border-radius: 2px; }
            @keyframes tree-menu-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .tree-menu-spin { display: inline-block; animation: tree-menu-spin 1s linear infinite; }
            .tree-menu-root .form-check { min-height: 1.5rem; padding-left: 1.75em; margin-bottom: 0; display: flex; align-items: center; }
            .tree-menu-root .form-check-input { margin-top: 0; margin-left: -1.75em; cursor: pointer; }
            .tree-menu-root input[type="checkbox"].form-check-input:indeterminate {
                background-color: #0d6efd; border-color: #0d6efd;
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3e%3cline x1='5' y1='10' x2='15' y2='10' stroke='%23fff' stroke-width='3' stroke-linecap='round'/%3e%3c/svg%3e");
            }
        `;
        document.head.appendChild(style);
    };

    // =========================================================================
    // 데이터 파싱 및 가상 모델 생성
    // =========================================================================
    /**
     * 컴포넌트 라이프사이클 초기화를 진행합니다.
     * @private
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

    /**
     * 중첩 계층 로우 데이터를 평탄화(Flatten)하여 내부 Map 모델로 재귀 빌드합니다.
     * @private
     */
    const _parseData = (dataList, parentId = null, pathStack = [], checkSnapshot = undefined) => {
        const cols = opt.columns;
        dataList.forEach(item => {
            const rawId      = typeof cols.id   === 'function' ? cols.id(item)   : item[cols.id];
            const type       = typeof cols.type === 'function' ? cols.type(item) : item[cols.type];
            const uniqueId   = `${type}:${rawId}`;
            const currentPath = pathStack.join(PATH_SEPARATOR);

            const parentChecked   = !!(parentId && nodes.get(parentId)?.isChecked);
            const snapshotChecked = checkSnapshot?.has(rawId) ? checkSnapshot.get(rawId) : null;
            const initialChecked  = snapshotChecked !== null ? snapshotChecked : parentChecked;

            const node = {
                id:              uniqueId,
                rawId,
                name:            item[cols.name],
                type,
                subText:         typeof cols.subText === 'function' ? cols.subText(item) : (item[cols.subText] || ''),
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

            const children = item[cols.children];
            if (children && children.length > 0) {
                _parseData(children, uniqueId, [...pathStack, node.name], checkSnapshot);
            }

            const extras = item[cols.extraItems];
            if (extras && extras.length > 0) {
                _parseExtraItems(extras, uniqueId, [...pathStack, node.name], checkSnapshot);
            }
        });
    };

    /**
     * 부서-사원 구조처럼 독립 필드로 존재하는 다중 데이터 필드를 자식 구조로 변환 매핑합니다.
     * @private
     */
    const _parseExtraItems = (items, parentId, pathStack, checkSnapshot) => {
        const cols        = opt.columns;
        const currentPath = pathStack.join(PATH_SEPARATOR);

        items.forEach(item => {
            const rawId    = typeof cols.id   === 'function' ? cols.id(item)   : item[cols.id];
            const type     = typeof cols.type === 'function' ? cols.type(item) : item[cols.type];
            const baseId   = `${type}:${rawId}@${parentId}`;

            const parentChecked   = !!(parentId && nodes.get(parentId)?.isChecked);
            const snapshotChecked = checkSnapshot?.has(rawId) ? checkSnapshot.get(rawId) : null;
            const initialChecked  = snapshotChecked !== null ? snapshotChecked : parentChecked;

            const node = {
                id:              baseId,
                rawId,
                name:            item[cols.name],
                type,
                subText:         typeof cols.subText === 'function' ? cols.subText(item) : (item[cols.subText] || ''),
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

            if (opt.selectorType === 'radio') {
                node.isIndeterminate = false;
            }

            let finalId = baseId;
            let sfx = 0;
            while (nodes.has(finalId)) {
                finalId = `${baseId}_${++sfx}`;
            }
            node.id = finalId;

            nodes.set(finalId, node);
            if (nodes.has(parentId)) {
                nodes.get(parentId).childrenIds.push(finalId);
            }

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
    // DOM 렌더링 및 HTML 스트링 구조 생성 빌더
    // =========================================================================
    /**
     * 가상 모델을 기반으로 트리 UI 전체를 DOM에 다시 그립니다.
     * @private
     */
    const _render = () => {
        if (!container || isSearching) return;

        const rootNodes = Array.from(nodes.values()).filter(n => n.parentId === null);

        if (rootNodes.length === 0) {
            container.innerHTML = _buildEmptyHtml();
        } else {
            let html = '<div class="tree-root tree-menu-root w-100">';
            rootNodes.forEach(node => {
                html += _buildNodeHtml(node);
            });
            html += '</div>';
            container.innerHTML = html;
        }
        _syncIndeterminateDOM();
    };

    /**
     * 노드가 비어있거나 하위 결과가 없을 경우의 대체 마크업을 생성합니다.
     * @private
     */
    const _buildEmptyHtml = () => {
        if (!opt.showEmptyMsg) return `<div class="tree-menu-empty"></div>`;
        const msg = opt.emptyMessage || '비어있습니다.';
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
     * 체크박스 또는 라디오 선택용 HTML 마크업 문자열을 만듭니다.
     * @private
     */
    const _buildSelectorHtml = (node, safeId) => {
        const showSelector = opt.selectorType !== 'none' && opt.selectorVisible(node.raw, node);
        if (!showSelector) return '';

        if (opt.selectorType === 'checkbox') {
            return `
            <div class="form-check mb-0">
                <label class="form-check-label" for="chk-${safeId}"></label>
                <input type="checkbox" class="form-check-input tree-checkbox" id="chk-${safeId}" ${node.isChecked ? 'checked' : ''}>
            </div>`;
        } else if (opt.selectorType === 'radio') {
            return `
            <div class="form-check mb-0">
                <label class="form-check-label" for="rad-${safeId}"></label>
                <input type="radio" class="form-check-input tree-radio" name="${selectorName}" id="rad-${safeId}" ${node.isChecked ? 'checked' : ''}>
            </div>`;
        }
        return '';
    };

    /**
     * 개별 단일 노드 개체 및 자식 래퍼 엘리먼트를 스트링 템플릿 형태로 인코딩합니다.
     * @private
     */
    const _buildNodeHtml = (node) => {
        const isFolder  = node.type === 'folder';
        const isFocused = focusedNodeId === node.id;

        const hasChildren = node.childrenIds.length > 0 || (isFolder && opt.lazyLoad && !node.isLoaded);

        let toggleHtml;
        if (node.isLoading) {
            toggleHtml = `<i class="bi ${opt.icons.loading} tree-menu-spin" style="font-size:0.8rem;"></i>`;
        } else if (node.type === 'folder' || hasChildren) {
            const chevron = node.isExpanded ? opt.icons.collapse : opt.icons.expand;
            toggleHtml = `<i class="bi ${chevron} tree-menu-cursor" style="font-size:0.8rem;"></i>`;
        } else {
            toggleHtml = `<i class="bi bi-dot" style="font-size:0.9rem;color:#dee2e6;"></i>`;
        }

        let iconClass;
        if (node.customIcon) {
            iconClass = node.customIcon;
        } else if (isFolder) {
            iconClass = (isFocused && opt.addClickCSS) ? 'bi-folder2-open text-primary' : (node.isExpanded ? opt.icons.folderOpen : opt.icons.folderClose);
        } else {
            iconClass = (isFocused && opt.addClickCSS) ? `${opt.icons.file} text-primary` : opt.icons.file;
        }

        const nameClass = (isFocused && opt.addClickCSS) ? 'text-nowrap text-primary fw-bold' : (isFolder ? 'text-nowrap fw-bold text-dark' : 'text-nowrap text-dark');
        const safeId = node.id.replace(/[^a-zA-Z0-9_-]/g, '-');

        const selectorHtml = _buildSelectorHtml(node, safeId);

        let childrenHtml = '';
        if (isFolder && node.isExpanded) {
            if (node.childrenIds.length > 0) {
                childrenHtml = `<nav class="nav flex-column tree-menu-children">`;
                node.childrenIds.forEach(cid => {
                    const child = nodes.get(cid);
                    if (child) childrenHtml += _buildNodeHtml(child);
                });
                childrenHtml += `</nav>`;
            } else if (!node.isLoading && (node.isLoaded || opt.lazyLoad)) {
                childrenHtml = `<nav class="nav flex-column tree-menu-children">${_buildEmptyHtml()}</nav>`;
            }
        }

        return `
        <div class="file-item-container py-1 w-100" data-id="${node.id}">
            <div class="tree-menu-nav-link${(isFocused && opt.addClickCSS) ? ' is-focused' : ''}">
                <div class="me-1 toggle-btn d-flex justify-content-center align-items-center" style="width:20px;flex-shrink:0;">
                    ${toggleHtml}
                </div>
                ${selectorHtml}
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
    // 브라우저 고성능 이벤트 위임 위젯 컨트롤러 인터페이스 바인딩
    // =========================================================================
    /**
     * 트리 루트 영역에 한 번만 단일 이벤트를 위임(Delegation) 처리해 런타임 메모리를 최적화합니다.
     * @private
     */
    const _setupEvents = () => {
        if (!container || container._treeMenuBound) return;
        container._treeMenuBound = true;

        container.addEventListener('click', async (e) => {
            const nodeEl = e.target.closest('[data-id]');
            if (!nodeEl) return;

            const node = nodes.get(nodeEl.dataset.id);
            if (!node) return;

            if (e.target.closest('.toggle-btn')) {
                e.stopPropagation();
                if (node.type === 'folder') {
                    await toggleNode(node);
                }
            } else if (e.target.classList.contains('tree-checkbox')) {
                e.stopPropagation();
                setCheck(node, e.target.checked);

            } else if (e.target.classList.contains('tree-radio')) {
                e.stopPropagation();
                setCheck(node, !node.isChecked);

            } else if (e.target.closest('.node-content')) {
                e.stopPropagation();
                focusedNodeId = node.id;

                const selectable = opt.selectorType !== 'none' && opt.selectorVisible(node.raw, node);

                if (selectable) {
                    if (opt.selectorType === 'radio') {
                        setCheck(node, !node.isChecked);
                    } else if (opt.selectorType === 'checkbox') {
                        setCheck(node, !node.isChecked);
                    }
                    if (opt.expandOnClick && opt.allowFolderToggleOnLabelClick && node.type === 'folder') {
                        await toggleNode(node);
                    }
                    return;
                }

                if (opt.expandOnClick && opt.allowFolderToggleOnLabelClick && node.type === 'folder') {
                    await toggleNode(node);
                }

                opt.onClick(node.raw);

                if (isSearching) {
                    _renderSearchList(lastResults || [], lastTerm || '');
                } else {
                    _render();
                }
            }
        });
    };

    // =========================================================================
    // 비동기 데이터 지연 로딩(LazyLoad) 및 UI 깜빡임 전면 개선 코어 엔진
    // =========================================================================
    /**
     * 비동기 원격 API를 호출하고 응답 성공 완료 시점에만 화면 구조를 깔끔하게 스와핑합니다.
     * @param {Object} node 비동기 호출 타겟 폴더 내부 노드 개체
     * @param {boolean} [isFirstExpand=false] 최초로 접힌 폴더를 열 때 호출된 것인지 여부
     * @private
     */
    const _loadLazyData = async (node, isFirstExpand = false) => {
        if (node.isLoaded && !opt.lazyReload) return;
        if (node.isLoading) return;

        const checkSnapshot = opt.lazyReload ? _collectCheckSnapshot(node) : undefined;

        node.isLoading = true;

        // [UX 개선 핵심] 최초 열기 동작(`isFirstExpand`)이거나 `lazyReload` 시
        // 하위 리스트 레이아웃을 통째로 밀어버리지 않고, 열린 상태 그대로 스피너 아이콘만 변경해 렌더링을 태웁니다.
        _render();

        try {
            const children = await opt.onLazyLoad(node.raw);

            // 비동기 응답 완료 직후에만 구조를 교체하여 빈 칸 깜빡임을 방지합니다.
            if (opt.lazyReload) _purgeDescendants(node);

            const pathParts = node.fullPath ? node.fullPath.split(PATH_SEPARATOR) : [];
            _parseData(children, node.id, [...pathParts, node.name], checkSnapshot);

            node.isLoading = false;
            node.isLoaded  = !opt.lazyReload;

            if (node.isChecked && !checkSnapshot) {
                _cascadeDown(node, true);
            }
            if (opt.lazyReload) {
                _cascadeUp(node.parentId);
            }
        } catch (err) {
            node.isLoading = false;
            console.error("TreeMenu LazyLoad Failed:", err);
        }
    };

    /**
     * 지정한 폴더 노드의 확장 및 축소 구조를 유연하게 토글 전환 제어합니다.
     * @param {Object} node 트리 내부 노드 객--체
     */
    const toggleNode = async (node) => {
        if (node.isLoading) return;

        // [버그 수정 완료]: 이미 열려 있는 폴더를 재클릭하면 정상적으로 다시 접어줍니다(Close).
        if (node.isExpanded) {
            node.isExpanded = false;
            _render();
            return;
        }

        // 닫혀있던 폴더 노드를 새롭게 오픈 확장하는 시점
        const needsLoad = opt.lazyLoad && (opt.lazyReload || !node.isLoaded);

        // [UX 개선 핵심] 토글이 접혔다 펴지는 모션을 사전에 완전 차단하기 위해, 데이터를 가져오기 전 상태값을 true로 먼저 고정합니다.
        node.isExpanded = true;

        if (needsLoad) {
            // 최초 확장을 알리는 플래그를 동봉하여 호출
            await _loadLazyData(node, true);
        }
        _render();
    };

    /**
     * 비동기 새로고침 진행 시, 기존 체크박스 유실 방지를 위한 1차 백업 스냅샷을 생성합니다.
     * @private
     */
    const _collectCheckSnapshot = (node) => {
        const snapshot = new Map();
        const collect = (n) => {
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
     * 하위 모델 캐시 데이터를 메모리 누수 없이 클린 아웃시킵니다.
     * @private
     */
    const _purgeDescendants = (node) => {
        const purge = (n) => {
            n.childrenIds.forEach(cid => {
                const child = nodes.get(cid);
                if (!child) return;
                purge(child);
                if (focusedNodeId === child.id) {
                    focusedNodeId = null;
                }
                nodes.delete(cid);
            });
        };
        purge(node);
        node.childrenIds = [];
    };

    // =========================================================================
    // 트리 계층형 선택/체크 관리 상태 제어 및 상하방 2중 전파 비즈니스 알고리즘
    // =========================================================================
    /**
     * 프로그램 구동 코드로 인스턴스 노드의 체크 상태를 제어하고 상하 관계 노드에 즉시 이벤트 상태를 반영합니다.
     * @param {Object} node 변경할 내부 노드 개체
     * @param {boolean} isChecked 체크 여부 사양 값
     */
    const setCheck = (node, isChecked) => {
        if (opt.selectorType === 'radio') {
            setRadio(node, isChecked);
            return;
        }

        node.isChecked       = isChecked;
        node.isIndeterminate = false;

        if (opt.cascadeCheck) {
            _cascadeDown(node, isChecked);
            _cascadeUp(node.parentId);
        }

        if (isSearching) {
            _renderSearchList(lastResults, lastTerm);
        } else {
            _render();
        }

        opt.onCheckChange(getSelectedFolders(), getSelectedFiles());
    };

    /**
     * 단일 전역 라디오 버튼 선택 알고리즘을 수행합니다.
     * @private
     */
    const setRadio = (node, isChecked) => {
        nodes.forEach(item => {
            item.isChecked = isChecked ? (item.id === node.id) : false;
            item.isIndeterminate = false;
        });

        _syncIndeterminateDOM();

        if (isSearching) {
            _renderSearchList(lastResults, lastTerm);
        } else {
            _render();
        }

        opt.onCheckChange(getSelectedFolders(), getSelectedFiles());
    };

    /**
     * 하위 모든 자식 손자 노드의 체크를 동일하게 세팅 처리합니다. (다운워드 캡처링)
     * @private
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
     * 자식들의 체크 상태 비율을 판정해 부모의 체크/상태(Indeterminate) 상태를 결정합니다. (업워드 버블링)
     * @private
     */
    const _cascadeUp = (parentId) => {
        if (opt.selectorType === 'radio' || !parentId) return;
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
     * 브라우저 네이티브 체크박스 엘리먼트의 제3의 상태(Indeterminate) 값을 DOM에 주입 동기화합니다.
     * @private
     */
    const _syncIndeterminateDOM = () => {
        nodes.forEach(node => {
            const safeId = node.id.replace(/[^a-zA-Z0-9_-]/g, '-');
            const el = document.getElementById(`chk-${safeId}`);
            if (el) {
                el.indeterminate = node.isIndeterminate;
            }
            const radEl = document.getElementById(`rad-${safeId}`);
            if (radEl) {
                radEl.indeterminate = false;
            }
        });
    };

    // =========================================================================
    // 초고속 문자열 매칭 실시간 대용량 필터 검색 가상 리스트 표현 기능
    // =========================================================================
    /**
     * 전달받은 단어를 수집 추적해 계층과 상관없이 직관적인 하이라이팅 검색 리스트로 뷰모드를 자동 스위칭합니다.
     * @param {string} keyword 사용자가 입력창에 작성한 텍스트 검색 키워드
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
            if (blob.includes(term)) {
                results.push(node);
            }
        });

        lastResults = results;
        _renderSearchList(results, term);
    };

    /**
     * 검색 키워드 결과 전용 마크 가상 리스트 템플릿 화면을 빌드합니다.
     * @private
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

            const selectorHtml = _buildSelectorHtml(node, safeId);

            html += `
            <div class="${itemClass}" data-id="${node.id}">
                <div class="d-flex align-items-center">
                    ${selectorHtml}
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
    // 외부 인스턴스 반환용 인스턴스 공개 API 인터페이스 명세 구현부
    // =========================================================================
    /**
     * 컴포넌트를 소멸하고 등록된 전역 변수 및 메모리 개체 캐시를 완전히 청소합니다.
     */
    const destroy = () => {
        if (container) {
            container.innerHTML = '';
            container._treeMenuBound = false;
        }
        nodes.clear();
        focusedNodeId = null;
        lastResults   = null;
        lastTerm      = null;
    };

    /**
     * 기존 트리의 캐시를 모두 제거하고 새로운 원본 데이터 어레이로 트리를 완전히 새로고침 바인딩합니다.
     * @param {Object[]} newDataList 신규 바인딩할 순수 원본 데이터 세트 배열
     */
    const setData = (newDataList) => {
        opt.data = newDataList || [];
        _init();
    };

    /**
     * 현재 선택된 모든 폴더 노드들의 순수 원본 데이터 오브젝트를 찾아 어레이 형태로 출력합니다.
     * @returns {Object[]}
     */
    const getSelectedFolders = () => {
        return Array.from(nodes.values())
            .filter(node => node.type === 'folder' && node.isChecked)
            .map(node => node.raw);
    };

    /**
     * 현재 선택된 파일 노드들의 원본 데이터를 리턴합니다.
     * @returns {Object[]}
     */
    const getSelectedFiles = () => {
        const seen = new Set();
        return Array.from(nodes.values())
            .filter(node => node.type === 'file' && node.isChecked)
            .filter(node => {
                if (seen.has(node.rawId)) return false;
                seen.add(node.rawId);
                return true;
            })
            .map(node => node.raw);
    };

    /**
     * 타입과 무관하게 체크박스가 활성화 처리된 전체 리스트를 원본 오브젝트 형태로 반환합니다.
     * @returns {Object[]}
     */
    const getSelectedAll = () => {
        return Array.from(nodes.values())
            .filter(node => node.isChecked)
            .map(node => node.raw);
    };

    /**
     * 외부 문자열 경로 인자값을 전달받아 역추적 방식으로 타겟 노드 계층을 순차 확장 후 포커싱 효과를 부여합니다.
     * @param {string} pathStr '루트폴더/서브폴더/파일명' 형식의 경로 맵 텍스트
     */
    const openPath = async (pathStr) => {
        if (!pathStr) return;

        const pathParts = pathStr.split('/').map(s => s.trim());
        let currentParentId = null;

        for (let i = 0; i < pathParts.length; i++) {
            const partName = pathParts[i];
            const targetNode = Array.from(nodes.values()).find(n => n.name === partName && n.parentId === currentParentId);

            if (!targetNode) break;

            if (targetNode.type === 'folder' && !targetNode.isExpanded) {
                await toggleNode(targetNode);
            }

            if (i === pathParts.length - 1) {
                focusedNodeId = targetNode.id;
            } else {
                currentParentId = targetNode.id;
            }
        }
        _render();
    };

    /**
     * 트리 전역에 흩어져있는 모든 폴더 개체를 원클릭으로 일제히 확장 오픈합니다.
     * @param {number} [level=-1] 확장할 한계 Depth 수치 지정자 (생략하거나 -1 입력 시 전체 확장 무제한 탐색)
     */
    const expandAll = async (level = -1) => {
        const folders = Array.from(nodes.values()).filter(node => node.type === 'folder');

        if (opt.lazyLoad) {
            const promises = folders.map(node => {
                const currentDepth = node.fullPath ? node.fullPath.split(PATH_SEPARATOR).length : 0;
                const shouldExpand = level < 0 || currentDepth < level;

                if (shouldExpand) {
                    node.isExpanded = true;
                    return _loadLazyData(node, true);
                }
                return null;
            }).filter(Boolean);

            await Promise.all(promises);
        } else {
            folders.forEach(node => {
                const currentDepth = node.fullPath ? node.fullPath.split(PATH_SEPARATOR).length : 0;
                const shouldExpand = level < 0 || currentDepth < level;
                if (shouldExpand) {
                    node.isExpanded = true;
                }
            });
        }

        _render();
    };

    /**
     * 트리에 노출되어 열려있는 전체 부모 폴더 노드를 한꺼번에 숨김 정렬 축소 상태로 전환합니다.
     */
    const collapseAll = () => {
        nodes.forEach(node => {
            if (node.type === 'folder') {
                node.isExpanded = false;
            }
        });
        _render();
    };

    // =========================================================================
    // 초기 런타임 빌드 실행 선언
    // =========================================================================
    _injectStyles();
    _init();

    // =========================================================================
    // 외부에 공개 인터페이스 API 노출 인스턴스 매핑 리턴
    // =========================================================================
    return {
        search,             // 검색
        setData,            // 새 데이터 세팅
        destroy,            // 완전 초기화

        getSelectedFolders, // 선택된 폴더 리스트
        getSelectedFiles,   // 선택된 파일 리스트
        getSelectedAll,     // 선택된 전체 리스트

        setCheck,           // 체크 상태 전파
        toggleNode,         // 토글 관리
        openPath,           // 해당 경로로 open
        expandAll,          // 모두 펼치기
        collapseAll,        // 모두 닫기
    };
};