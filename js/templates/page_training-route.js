import { collection, deleteField, doc, getDoc, getFirestore, onSnapshot, query, updateDoc, where } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js';
import { BoardRenderer } from '../components/system_board/board-renderer.js?training';
import bottomNavi from '../components/bottom_navi/bottom_navi.js';
import statusTicker from '../components/ds-statusticker/index.js?training';
import { dce } from '../shared/helpers.js';
import { globals } from '../shared/globals.js';
import { route } from '../shared/route.js';

const isTrainingTag = (tag) => typeof tag === 'string' && tag.toLowerCase() === 'training';
const isTrainingRoute = (routeData) => routeData.training === true
  || (Array.isArray(routeData.tags) ? routeData.tags : [routeData.tags]).some(isTrainingTag);

const getHoldType = (holdSetup, holdId) => {
  const value = holdSetup[holdId];
  return typeof value === 'string' ? value : value && value.type;
};

const getLightingGroups = (routeData) => {
  const holdSetup = routeData.holdSetup || {};
  const startHolds = Object.keys(holdSetup).filter((holdId) => getHoldType(holdSetup, holdId) === 'start');
  const endHolds = Object.keys(holdSetup).filter((holdId) => getHoldType(holdSetup, holdId) === 'top');
  const fixedHolds = new Set([...startHolds, ...endHolds]);
  const seenHolds = new Set(fixedHolds);
  const middleGroups = [];

  (Array.isArray(routeData.lightingOrder) ? routeData.lightingOrder : []).forEach((entry) => {
    const holdIds = Array.isArray(entry) ? entry : Array.isArray(entry && entry.holds) ? entry.holds : [entry];
    const group = holdIds.filter((holdId) => {
      if (typeof holdId !== 'string' || !holdSetup[holdId] || seenHolds.has(holdId)) return false;
      seenHolds.add(holdId);
      return true;
    });
    if (holdIds.some((holdId) => getHoldType(holdSetup, holdId) === 'start')) startHolds.push(...group);
    else if (holdIds.some((holdId) => getHoldType(holdSetup, holdId) === 'top')) endHolds.push(...group);
    else if (group.length) middleGroups.push(group);
  });

  return [
    ...(startHolds.length ? [startHolds] : []),
    ...middleGroups,
    ...(endHolds.length ? [endHolds] : [])
  ];
};

class viewTrainingRoute {
  constructor() {
    const page = dce({el: 'MAIN', cssClass: 'page-training-route'});
    const ticker = new statusTicker({interactive: false, title: 'Lighting order'});

    const content = dce({el: 'DIV', cssClass: 'training-route-content'});
    const editorControls = dce({el: 'SECTION', cssClass: 'training-route-controls'});
    const routeLabel = dce({el: 'LABEL', content: 'Route'});
    const routeSelect = dce({el: 'SELECT'});
    routeSelect.name = 'training-route-source';
    const placeholder = dce({el: 'OPTION', content: 'Choose a route'});
    placeholder.value = '';
    routeSelect.appendChild(placeholder);
    routeLabel.appendChild(routeSelect);
    const status = dce({el: 'P', cssClass: 'training-status', content: 'Loading routes and board…'});
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const previewControls = dce({el: 'DIV', cssClass: 'training-preview-controls'});
    const playPreviewButton = dce({el: 'BUTTON', cssClass: 'btn training-preview-play', content: 'Play sequence'});
    playPreviewButton.type = 'button';
    playPreviewButton.disabled = true;
    const stopPreviewButton = dce({el: 'BUTTON', cssClass: 'btn destructive training-preview-stop', content: 'Stop'});
    stopPreviewButton.type = 'button';
    stopPreviewButton.disabled = true;
    const previewStatus = dce({el: 'P', cssClass: 'training-preview-status'});
    previewStatus.setAttribute('role', 'status');
    previewStatus.setAttribute('aria-live', 'polite');
    previewControls.append(playPreviewButton, stopPreviewButton, previewStatus);
    const boardScroller = dce({el: 'DIV', cssClass: 'training-board-scroller'});
    const boardContainer = dce({el: 'DIV', cssClass: `board-container training-board ${globals.board.toLowerCase()}`});
    boardScroller.appendChild(boardContainer);
    const orderPanel = dce({el: 'SECTION', cssClass: 'training-order-panel'});
    const orderSummary = dce({el: 'H2', content: 'Lighting order'});
    const orderList = dce({el: 'OL', cssClass: 'training-hold-order'});
    orderPanel.append(orderSummary, orderList);
    const saveButton = dce({el: 'BUTTON', cssClass: 'btn training-save', content: 'Save lighting order'});
    saveButton.type = 'button';
    saveButton.disabled = true;
    const removeSequenceButton = dce({el: 'BUTTON', cssClass: 'btn destructive training-save training-remove mt-10', content: 'Remove training sequence'});
    removeSequenceButton.type = 'button';
    removeSequenceButton.disabled = true;
    editorControls.append(routeLabel, status, previewControls, orderPanel, saveButton, removeSequenceButton);
    content.append(boardScroller, editorControls);

    const footerNavi = new bottomNavi({options: {
	  board: {
        title: 'Exit training',
        icon: 'climb',
        link: () => route('board')
      },

      list: {
        title: 'Training',
        icon: 'timer',
        link: () => route('training')
      }
    }});
    page.append(ticker.render(), content, footerNavi.render());

    const db = getFirestore();
    const boardRenderer = new BoardRenderer();
    let boardRoutes = [];
    let boardSetup = null;
    let selectedRoute = null;
    let lightingGroups = [];
    let boardArtworkReady = false;
    let saving = false;
    let previewTimer = null;
    let previewSequence = [];
    let previewIndex = -1;
    let previewStepDeadline = 0;
    let previewing = false;
    let previewHasHighlights = false;

    const getHoldLabel = (holdId) => {
      const position = holdId.match(/^([a-z]+)(\d+)$/i);
      const height = Number(boardSetup && boardSetup.characteristics && boardSetup.characteristics.height);
      return position && height > 0
        ? `${position[1].toUpperCase()}${height - Number(position[2]) + 1}`
        : holdId.toUpperCase();
    };

    const getMissingHoldIds = () => {
      const holdIds = Object.keys(selectedRoute && selectedRoute.holdSetup ? selectedRoute.holdSetup : {});
      const orderedHoldIds = new Set(lightingGroups.flat());
      return holdIds.filter((holdId) => !orderedHoldIds.has(holdId));
    };

    const updateOrderStatus = () => {
      if (!selectedRoute) {
        status.textContent = 'Choose an existing route to edit its lighting order.';
        previewStatus.textContent = 'Select a route to preview its lighting order.';
        return;
      }
      const holdCount = Object.keys(selectedRoute.holdSetup || {}).length;
      const missingCount = getMissingHoldIds().length;
      status.textContent = missingCount
        ? `${missingCount} of ${holdCount} holds still need an order.`
        : `All ${holdCount} route holds have an order.`;
      if (!previewing && !previewHasHighlights) {
        previewStatus.textContent = missingCount
          ? `Order ${missingCount} remaining hold${missingCount === 1 ? '' : 's'} to enable preview.`
          : `Ready to preview ${selectedRoute.name || 'this route'}.`;
      }
    };

    const updateSaveState = () => {
      const holdCount = Object.keys(selectedRoute && selectedRoute.holdSetup ? selectedRoute.holdSetup : {}).length;
      const missingCount = getMissingHoldIds().length;
      const stepCount = lightingGroups.length;
      orderSummary.textContent = `Lighting order · ${stepCount} steps · ${holdCount - missingCount} of ${holdCount} holds`;
      routeSelect.disabled = saving;
      saveButton.disabled = saving || !selectedRoute || holdCount === 0 || missingCount > 0;
      removeSequenceButton.disabled = saving || !selectedRoute || !(isTrainingRoute(selectedRoute)
        || (Array.isArray(selectedRoute.lightingOrder) && selectedRoute.lightingOrder.length > 0));
      playPreviewButton.disabled = saving || previewing || !selectedRoute || holdCount === 0 || missingCount > 0;
      playPreviewButton.textContent = previewing ? 'Playing…' : 'Play sequence';
      stopPreviewButton.disabled = saving || !previewing;
    };

    const isPinnedGroup = (group) => group.some((holdId) => {
      const type = getHoldType(selectedRoute.holdSetup || {}, holdId);
      return type === 'start' || type === 'top';
    });

    const clearPreviewDisplay = () => {
      boardContainer.classList.remove('training-preview-active');
      boardContainer.querySelectorAll('.training-preview-lit, .training-preview-hidden, .training-preview-revealed').forEach((cell) => {
        cell.classList.remove('training-preview-lit', 'training-preview-hidden', 'training-preview-revealed');
      });
      for (const [holdId, holdType] of Object.entries(selectedRoute && selectedRoute.holdSetup ? selectedRoute.holdSetup : {})) {
        setRouteHoldMarker(holdId, holdType, true);
      }
    };

    const setRouteHoldMarker = (holdId, holdType, visible) => {
      const cell = boardContainer.querySelector(`#${holdId}`);
      if (!cell) return;

      cell.classList.toggle('selected', visible);
      ['start', 'top', 'intermediate', 'foot'].forEach((type) => cell.classList.toggle(type, visible && holdType === type));
      const order = lightingGroups.findIndex((group) => group.includes(holdId));
      cell.classList.toggle('training-in-order', visible && order >= 0);

      if (visible) {
        cell.removeAttribute('aria-hidden');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-pressed', String(order >= 0));
        cell.setAttribute('aria-label', order >= 0
          ? `Hold ${getHoldLabel(holdId)}, lighting step ${order + 1}${lightingGroups[order].length > 1 ? ', lit with other holds' : ''}`
          : `Add hold ${getHoldLabel(holdId)} to lighting order`);
        if (order >= 0) cell.dataset.trainingOrder = String(order + 1);
        else delete cell.dataset.trainingOrder;
      } else {
        cell.setAttribute('aria-hidden', 'true');
        cell.setAttribute('tabindex', '-1');
        cell.removeAttribute('aria-pressed');
        cell.removeAttribute('aria-label');
        delete cell.dataset.trainingOrder;
      }
    };

    const scrollToPreviewGroup = (group) => {
      const cells = group.map((holdId) => boardContainer.querySelector(`#${holdId}`)).filter(Boolean);
      if (!cells.length) return;

      const scrollerRect = boardScroller.getBoundingClientRect();
      const cellRects = cells.map((cell) => cell.getBoundingClientRect());
      const centerX = (Math.min(...cellRects.map((rect) => rect.left)) + Math.max(...cellRects.map((rect) => rect.right))) / 2
        - scrollerRect.left + boardScroller.scrollLeft;
      const centerY = (Math.min(...cellRects.map((rect) => rect.top)) + Math.max(...cellRects.map((rect) => rect.bottom))) / 2
        - scrollerRect.top + boardScroller.scrollTop;
      const left = Math.max(0, Math.min(centerX - boardScroller.clientWidth / 2, boardScroller.scrollWidth - boardScroller.clientWidth));
      const top = Math.max(0, Math.min(centerY - boardScroller.clientHeight / 2, boardScroller.scrollHeight - boardScroller.clientHeight));

      boardScroller.scrollTo({left, top, behavior: 'smooth'});
    };

    const stopPreview = () => {
      if (previewTimer !== null) window.clearInterval(previewTimer);
      previewTimer = null;
      previewSequence = [];
      previewIndex = -1;
      previewing = false;
      previewHasHighlights = false;
      clearPreviewDisplay();
      previewStatus.textContent = 'Stopped. All route holds are visible.';
      updateSaveState();
    };

    const showPreviewStep = (index) => {
      clearPreviewDisplay();
      boardContainer.classList.add('training-preview-active');
      const group = previewSequence[index];
      previewSequence.forEach((step, stepIndex) => {
        const className = stepIndex > index
          ? 'training-preview-hidden'
          : stepIndex < index ? 'training-preview-revealed' : 'training-preview-lit';
        step.forEach((holdId) => {
          const holdType = selectedRoute.holdSetup[holdId];
          const cell = boardContainer.querySelector(`#${holdId}`);
          if (stepIndex > index) {
            setRouteHoldMarker(holdId, holdType, false);
            cell?.classList.add(className);
          } else {
            setRouteHoldMarker(holdId, holdType, true);
            cell?.classList.add(className);
          }
        });
      });
      scrollToPreviewGroup(group);
      previewHasHighlights = true;
      previewStepDeadline = Date.now() + (group.some((holdId) => getHoldType(selectedRoute.holdSetup || {}, holdId) === 'top') ? 3000 : 1000);
      previewStatus.textContent = `Lighting step ${index + 1} of ${previewSequence.length}`;
    };

    const playPreview = () => {
      if (!selectedRoute || getMissingHoldIds().length) {
        previewStatus.textContent = 'Complete the hold order before previewing.';
        return;
      }

      previewSequence = lightingGroups.map((group) => [...group]);
      previewIndex = 0;
      previewing = true;
      showPreviewStep(previewIndex);
      updateSaveState();
      previewTimer = window.setInterval(() => {
        if (!page.isConnected) {
          stopPreview();
          return;
        }
        if (Date.now() < previewStepDeadline) return;

        if (previewIndex + 1 >= previewSequence.length) {
          window.clearInterval(previewTimer);
          previewTimer = null;
          previewing = false;
          previewHasHighlights = false;
          clearPreviewDisplay();
          previewStatus.textContent = 'Sequence complete. All route holds are visible.';
          updateSaveState();
          return;
        }

        previewIndex += 1;
        showPreviewStep(previewIndex);
      }, 100);
    };

    const renderOrderList = () => {
      if (previewing || previewHasHighlights) stopPreview();
      orderList.replaceChildren();
      let firstMiddleIndex = 0;
      while (firstMiddleIndex < lightingGroups.length && isPinnedGroup(lightingGroups[firstMiddleIndex])) firstMiddleIndex += 1;
      let lastMiddleIndex = lightingGroups.length - 1;
      while (lastMiddleIndex >= 0 && isPinnedGroup(lightingGroups[lastMiddleIndex])) lastMiddleIndex -= 1;

      lightingGroups.forEach((group, index) => {
        const pinned = isPinnedGroup(group);
        const holdTypes = group.map((holdId) => getHoldType(selectedRoute.holdSetup || {}, holdId));
        const groupLabel = holdTypes.includes('start') ? 'START' : holdTypes.includes('top') ? 'END' : `STEP ${index + 1}`;
        const item = dce({el: 'LI', cssClass: 'training-hold-order-item'});
        item.classList.toggle('is-grouped', group.length > 1);
        const description = dce({el: 'DIV', cssClass: 'training-hold-order-description'});
        const holdsList = dce({el: 'UL', cssClass: 'training-hold-order-holds'});
        group.forEach((holdId) => holdsList.appendChild(dce({el: 'LI', content: getHoldLabel(holdId)})));
        description.append(
          dce({el: 'SPAN', cssClass: 'training-hold-order-step', content: groupLabel}),
          holdsList
        );
        const controls = dce({el: 'DIV', cssClass: 'training-order-controls'});

        const moveUp = dce({el: 'BUTTON', cssClass: 'btn btn_small', content: '↑'});
        moveUp.type = 'button';
        moveUp.setAttribute('aria-label', `Move step ${index + 1} up`);
        moveUp.disabled = pinned || index <= firstMiddleIndex;
        moveUp.addEventListener('click', () => {
          [lightingGroups[index - 1], lightingGroups[index]] = [lightingGroups[index], lightingGroups[index - 1]];
          renderOrderList();
          syncBoardOrder();
        });

        const moveDown = dce({el: 'BUTTON', cssClass: 'btn btn_small', content: '↓'});
        moveDown.type = 'button';
        moveDown.setAttribute('aria-label', `Move step ${index + 1} down`);
        moveDown.disabled = pinned || index >= lastMiddleIndex;
        moveDown.addEventListener('click', () => {
          [lightingGroups[index + 1], lightingGroups[index]] = [lightingGroups[index], lightingGroups[index + 1]];
          renderOrderList();
          syncBoardOrder();
        });
        controls.append(moveUp, moveDown);

        const previousTypes = index > 0
          ? lightingGroups[index - 1].map((holdId) => getHoldType(selectedRoute.holdSetup || {}, holdId))
          : [];
        if (index > 0 && !previousTypes.includes('top')
          && (!pinned || (holdTypes.includes('top') && !previousTypes.includes('start')))) {
          const groupButton = dce({el: 'BUTTON', cssClass: 'btn btn_small training-group-button', content: '🔗'});
          groupButton.type = 'button';
          groupButton.setAttribute('aria-label', 'Group with previous step');
          groupButton.title = 'Group with previous step';
          groupButton.addEventListener('click', () => {
            lightingGroups[index - 1] = [...lightingGroups[index - 1], ...group];
            lightingGroups.splice(index, 1);
            renderOrderList();
            syncBoardOrder();
          });
          controls.appendChild(groupButton);
        }

        if (group.length > 1 && (!pinned || holdTypes.some((type) => type !== 'start' && type !== 'top'))) {
          const ungroupButton = dce({el: 'BUTTON', cssClass: 'btn btn_small training-ungroup-button', content: '⛓️‍💥'});
          ungroupButton.type = 'button';
          ungroupButton.setAttribute('aria-label', `Ungroup step ${index + 1}`);
          ungroupButton.title = 'Ungroup step';
          ungroupButton.addEventListener('click', () => {
            if (pinned) {
              const fixedHolds = group.filter((holdId) => ['start', 'top'].includes(getHoldType(selectedRoute.holdSetup || {}, holdId)));
              const otherGroups = group.filter((holdId) => !fixedHolds.includes(holdId)).map((holdId) => [holdId]);
              lightingGroups.splice(index, 1, ...(holdTypes.includes('start')
                ? [fixedHolds, ...otherGroups]
                : [...otherGroups, fixedHolds]));
            } else {
              lightingGroups.splice(index, 1, ...group.map((holdId) => [holdId]));
            }
            renderOrderList();
            syncBoardOrder();
          });
          controls.appendChild(ungroupButton);
        }

        item.append(description, controls);
        orderList.appendChild(item);
      });
      updateSaveState();
      updateOrderStatus();
    };

    const syncBoardOrder = () => {
      const routeHolds = selectedRoute && selectedRoute.holdSetup ? selectedRoute.holdSetup : {};
      for (const holdId of Object.keys(routeHolds)) {
        const cell = boardContainer.querySelector(`#${holdId}`);
        if (!cell) continue;
        const order = lightingGroups.findIndex((group) => group.includes(holdId));
        cell.classList.toggle('training-in-order', order >= 0);
        cell.setAttribute('aria-pressed', String(order >= 0));
        cell.setAttribute('aria-label', order >= 0
          ? `Hold ${getHoldLabel(holdId)}, lighting step ${order + 1}${lightingGroups[order].length > 1 ? ', lit with other holds' : ''}`
          : `Add hold ${getHoldLabel(holdId)} to lighting order`);
        if (order >= 0) cell.dataset.trainingOrder = String(order + 1);
        else delete cell.dataset.trainingOrder;
      }
    };

    const toggleHold = (holdId) => {
      const holdType = getHoldType(selectedRoute.holdSetup || {}, holdId);
      if (holdType === 'start' || holdType === 'top') {
        status.textContent = 'Start and end holds are fixed and lit together.';
        return;
      }

      const groupIndex = lightingGroups.findIndex((group) => group.includes(holdId));
      if (groupIndex >= 0) {
        lightingGroups[groupIndex] = lightingGroups[groupIndex].filter((id) => id !== holdId);
        if (!lightingGroups[groupIndex].length) lightingGroups.splice(groupIndex, 1);
      } else {
        const endGroupIndex = lightingGroups.findIndex((group) => group.some((id) => getHoldType(selectedRoute.holdSetup || {}, id) === 'top'));
        const insertAt = endGroupIndex >= 0 ? endGroupIndex : lightingGroups.length;
        lightingGroups.splice(insertAt, 0, [holdId]);
      }
      renderOrderList();
      syncBoardOrder();
    };

    const renderBoard = async () => {
      boardContainer.replaceChildren();
      if (!selectedRoute) {
        boardContainer.style.width = '';
        boardContainer.style.height = '';
        status.textContent = 'Choose an existing route to edit its lighting order.';
        return;
      }
      if (!boardArtworkReady || !boardSetup) {
        status.textContent = 'Loading board holds…';
        return;
      }

      const routeHolds = selectedRoute.holdSetup || {};
      const holdIds = Object.keys(routeHolds);
      if (!holdIds.length) {
        status.textContent = 'This route has no holds to sequence.';
        return;
      }

      const boardData = {
        ...boardSetup,
        holdSetup: {...(boardSetup.holdSetup || {})}
      };
      boardRenderer.drawHolds(boardContainer, boardData, {
        skipGlobalSetup: true,
        interactiveHoldIds: holdIds,
        lightingOrder: lightingGroups,
        onHoldClick: toggleHold
      });

      for (const [holdId, holdType] of Object.entries(routeHolds)) {
        const cell = boardContainer.querySelector(`#${holdId}`);
        if (cell) cell.classList.add('selected', typeof holdType === 'string' ? holdType : 'intermediate');
      }
      syncBoardOrder();
      updateOrderStatus();
    };

    const renderRouteOptions = () => {
      const currentId = routeSelect.value;
      routeSelect.replaceChildren(placeholder);
      boardRoutes.filter((routeData) => !routeData.archived)
        .sort((first, second) => Number(isTrainingRoute(second)) - Number(isTrainingRoute(first))
          || (first.name || 'Unnamed route').localeCompare(second.name || 'Unnamed route'))
        .forEach((routeData) => {
          const grade = globals.grades.font[routeData.grade] || '';
          const option = dce({el: 'OPTION', content: `${isTrainingRoute(routeData) ? '(T) ' : ''}${routeData.name || 'Unnamed route'}${grade ? ` · ${grade}` : ''}`});
          option.value = routeData.id;
          routeSelect.appendChild(option);
        });
      if (boardRoutes.some((routeData) => routeData.id === currentId)) routeSelect.value = currentId;
    };

    routeSelect.addEventListener('change', () => {
      if (previewing || previewHasHighlights) stopPreview();
      selectedRoute = boardRoutes.find((routeData) => routeData.id === routeSelect.value) || null;
      lightingGroups = selectedRoute ? getLightingGroups(selectedRoute) : [];
      renderOrderList();
      renderBoard();
    });

    playPreviewButton.addEventListener('click', playPreview);
    stopPreviewButton.addEventListener('click', stopPreview);

    saveButton.addEventListener('click', async () => {
      const user = getAuth().currentUser;
      if (!selectedRoute || !lightingGroups.length || !user) {
        status.textContent = 'Sign in and choose at least one hold before saving.';
        return;
      }

      saving = true;
      updateSaveState();
      status.textContent = 'Saving lighting order…';
      try {
        await updateDoc(doc(db, 'routes', selectedRoute.id), {
          training: true,
          lightingOrder: lightingGroups.map((holds) => ({holds: [...holds]})),
          trainingUpdatedAt: new Date()
        });
        selectedRoute.training = true;
        selectedRoute.lightingOrder = lightingGroups.map((holds) => ({holds: [...holds]}));
        status.textContent = 'Training tag and lighting order saved to this route.';
        renderRouteOptions();
      } catch (error) {
        console.error('Failed to save training route:', error);
        status.textContent = 'Could not save this route. Check your connection and try again.';
      } finally {
        saving = false;
        updateSaveState();
      }
    });

    removeSequenceButton.addEventListener('click', async () => {
      if (saving || !selectedRoute) return;
      if (!getAuth().currentUser) {
        status.textContent = 'Sign in to remove a training sequence.';
        return;
      }
      const routeData = selectedRoute;
      if (!window.confirm(`Remove the training sequence from ${routeData.name || 'this route'}? The climbing route will be kept.`)) return;

      if (previewing || previewHasHighlights) stopPreview();
      saving = true;
      updateSaveState();
      status.textContent = 'Removing training sequence…';
      const updates = {
        training: false,
        lightingOrder: deleteField(),
        trainingUpdatedAt: deleteField()
      };
      if (Array.isArray(routeData.tags)) updates.tags = routeData.tags.filter((tag) => !isTrainingTag(tag));
      else if (isTrainingTag(routeData.tags)) updates.tags = deleteField();

      try {
        await updateDoc(doc(db, 'routes', routeData.id), updates);
        routeData.training = false;
        delete routeData.lightingOrder;
        delete routeData.trainingUpdatedAt;
        if (Array.isArray(routeData.tags)) routeData.tags = updates.tags;
        else if (isTrainingTag(routeData.tags)) delete routeData.tags;
        boardRoutes = boardRoutes.map((entry) => entry.id === routeData.id ? routeData : entry);
        selectedRoute = routeData;
        lightingGroups = getLightingGroups(routeData);
        renderRouteOptions();
        renderOrderList();
        renderBoard();
        status.textContent = 'Training sequence removed. Climbing route kept.';
      } catch (error) {
        console.error('Failed to remove training sequence:', error);
        status.textContent = 'Could not remove training sequence. Check your connection and try again.';
      } finally {
        saving = false;
        updateSaveState();
      }
    });

    let unsubscribe = () => {};
    const routesQuery = query(collection(db, 'routes'), where('napakboard', '==', globals.board));
    unsubscribe = onSnapshot(routesQuery, (snapshot) => {
      if (!page.isConnected) {
        unsubscribe();
        return;
      }
      boardRoutes = snapshot.docs.map((routeDoc) => ({id: routeDoc.id, ...routeDoc.data()}));
      renderRouteOptions();
      if (selectedRoute) {
        selectedRoute = boardRoutes.find((routeData) => routeData.id === selectedRoute.id) || selectedRoute;
        if (selectedRoute.archived) {
          selectedRoute = null;
          lightingGroups = [];
          routeSelect.value = '';
          renderOrderList();
          renderBoard();
        }
      }
    }, (error) => {
      console.error('Failed to load routes for training editor:', error);
      status.textContent = 'Could not load routes. Check your connection and try again.';
    });

    Promise.all([
      getDoc(doc(db, 'boardSetup', globals.board)),
      boardRenderer.getHoldSetup()
    ]).then(([setupSnapshot]) => {
      if (!page.isConnected) return;
      boardSetup = setupSnapshot.exists() ? setupSnapshot.data().boardSetup : null;
      boardArtworkReady = true;
      if (!boardSetup) {
        status.textContent = 'Board setup is not available.';
        return;
      }
      renderOrderList();
      renderBoard();
    }).catch((error) => {
      console.error('Failed to load board for training editor:', error);
      status.textContent = 'Could not load board holds. Check your connection and try again.';
    });

    const pageContent = document.querySelector('.page-content');
    if (pageContent) {
      const pageObserver = new MutationObserver(() => {
        if (!page.isConnected) {
          unsubscribe();
          if (previewing || previewHasHighlights) stopPreview();
          pageObserver.disconnect();
        }
      });
      pageObserver.observe(pageContent, {childList: true});
    }

    this.render = () => page;
  }
}

export default viewTrainingRoute;
