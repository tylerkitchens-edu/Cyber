/* Interactive pieces for the lesson pages (2026-11-16).
   Include once per page:
     <link rel="stylesheet" href="../../interactive.css">
     <script src="../../interactive.js" defer></script>

   1) "Knowledge check" question (ungraded, instant feedback). data-answer is the 0-based index of the right option.
      <div class="check" data-answer="1">
        <p class="check-q">Question?</p>
        <div class="check-options"><button type="button">Option A</button><button type="button">Option B</button></div>
        <p class="check-why">Why the right answer is right.</p>
      </div>

   2) RAID simulator: <div class="raid-sim"></div>
*/
(function () {
  'use strict';

  function setupCheck(box) {
    var answer = parseInt(box.getAttribute('data-answer'), 10);
    var buttons = box.querySelectorAll('.check-options button');
    var why = box.querySelector('.check-why');
    var result = document.createElement('p');
    result.className = 'check-result';
    result.setAttribute('aria-live', 'polite');
    if (why) { why.hidden = true; box.insertBefore(result, why); } else { box.appendChild(result); }

    Array.prototype.forEach.call(buttons, function (btn, i) {
      btn.addEventListener('click', function () {
        if (box.classList.contains('answered')) return;
        if (i === answer) {
          btn.classList.add('right');
          box.classList.add('answered');
          result.textContent = 'Correct.';
          result.className = 'check-result ok';
          if (why) why.hidden = false;
          Array.prototype.forEach.call(buttons, function (b) { b.disabled = true; });
        } else {
          btn.classList.add('wrong');
          btn.disabled = true;
          result.textContent = 'Not quite. Try again.';
          result.className = 'check-result no';
        }
      });
    });
  }

  var RAID = {
    '0':  { drives: 2, label: 'RAID 0 (striping)',               usable: function (n) { return n; },     lost: function (f) { return f.length >= 1; } },
    '1':  { drives: 2, label: 'RAID 1 (mirroring)',              usable: function () { return 1; },      lost: function (f, n) { return f.length >= n; } },
    '5':  { drives: 3, label: 'RAID 5 (striping with parity)',   usable: function (n) { return n - 1; }, lost: function (f) { return f.length >= 2; } },
    '6':  { drives: 4, label: 'RAID 6 (double parity)',          usable: function (n) { return n - 2; }, lost: function (f) { return f.length >= 3; } },
    '10': { drives: 4, label: 'RAID 10 (mirrored stripes)',      usable: function (n) { return n / 2; }, lost: function (f) {
      // Drives 1+2 are one mirror, drives 3+4 the other. Data is lost if both drives of either mirror fail.
      return (f.indexOf(0) > -1 && f.indexOf(1) > -1) || (f.indexOf(2) > -1 && f.indexOf(3) > -1);
    } }
  };

  function setupRaid(root) {
    var level = '0';
    var failed = [];
    root.innerHTML =
      '<p class="raid-help">Pick a RAID level, then click drives to make them fail. Each drive holds 1 TB.</p>' +
      '<div class="raid-levels" role="group" aria-label="RAID level"></div>' +
      '<div class="raid-drives"></div>' +
      '<p class="raid-status" aria-live="polite"></p>' +
      '<button type="button" class="raid-reset">Repair all drives</button>';
    var levelsEl = root.querySelector('.raid-levels');
    var drivesEl = root.querySelector('.raid-drives');
    var statusEl = root.querySelector('.raid-status');

    Object.keys(RAID).forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'RAID ' + k;
      b.setAttribute('data-level', k);
      b.addEventListener('click', function () { level = k; failed = []; render(); });
      levelsEl.appendChild(b);
    });
    root.querySelector('.raid-reset').addEventListener('click', function () { failed = []; render(); });

    function render() {
      var cfg = RAID[level];
      Array.prototype.forEach.call(levelsEl.children, function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-level') === level ? 'true' : 'false');
      });
      drivesEl.innerHTML = '';
      for (var i = 0; i < cfg.drives; i++) {
        (function (i) {
          var d = document.createElement('button');
          d.type = 'button';
          var down = failed.indexOf(i) > -1;
          d.className = 'raid-drive' + (down ? ' failed' : '');
          var group = level === '10' ? '<span class="raid-pair">mirror ' + (i < 2 ? 'A' : 'B') + '</span>' : '';
          d.innerHTML = '<span class="raid-icon" aria-hidden="true">' + (down ? '&#10007;' : '&#9635;') + '</span>Drive ' + (i + 1) + group + '<span class="raid-state">' + (down ? 'FAILED' : 'working') + '</span>';
          d.setAttribute('aria-label', 'Drive ' + (i + 1) + (down ? ', failed. Click to repair.' : ', working. Click to fail it.'));
          d.addEventListener('click', function () {
            var at = failed.indexOf(i);
            if (at > -1) failed.splice(at, 1); else failed.push(i);
            render();
          });
          drivesEl.appendChild(d);
        })(i);
      }
      var lost = cfg.lost(failed, cfg.drives);
      var cap = cfg.usable(cfg.drives);
      var msg = cfg.label + ': ' + cfg.drives + ' drives, ' + cap + ' TB usable. ';
      if (failed.length === 0) msg += 'All drives working.';
      else if (lost) msg += 'Too many drives failed: the data is LOST. Restore from your backup.';
      else msg += failed.length + (failed.length === 1 ? ' drive' : ' drives') + ' failed, but the data is SAFE. Replace the failed drive so the array can rebuild.';
      statusEl.textContent = msg;
      statusEl.className = 'raid-status' + (failed.length === 0 ? '' : lost ? ' lost' : ' safe');
    }
    render();
  }

  /* 3) Put-in-order exercise. Write the items in the CORRECT order; the page shuffles them.
     <div class="order-steps"><p class="order-q">Put the steps in order.</p>
       <ol><li>First</li><li>Second</li>...</ol></div> */
  function setupOrder(root) {
    var correct = Array.prototype.map.call(root.querySelectorAll('ol > li'), function (li) { return li.textContent.trim(); });
    var oldList = root.querySelector('ol');
    var items = correct.slice();
    function shuffle() {
      do {
        for (var i = items.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = items[i]; items[i] = items[j]; items[j] = t; }
      } while (items.join('|') === correct.join('|'));
    }
    shuffle();
    var list = document.createElement('ol');
    list.className = 'order-list';
    oldList.parentNode.replaceChild(list, oldList);
    var controls = document.createElement('div');
    controls.className = 'order-controls';
    controls.innerHTML = '<button type="button" class="order-check">Check my order</button> <button type="button" class="order-reset">Shuffle again</button>';
    var result = document.createElement('p');
    result.className = 'order-result';
    result.setAttribute('aria-live', 'polite');
    root.appendChild(controls);
    root.appendChild(result);
    var marks = null;

    function render() {
      list.innerHTML = '';
      items.forEach(function (text, i) {
        var li = document.createElement('li');
        if (marks) li.className = marks[i] ? 'right' : 'wrong';
        var label = document.createElement('span');
        label.className = 'order-text';
        label.textContent = text;
        var up = document.createElement('button');
        up.type = 'button'; up.textContent = '↑'; up.disabled = i === 0;
        up.setAttribute('aria-label', 'Move "' + text + '" up');
        up.addEventListener('click', function () { move(i, -1); });
        var down = document.createElement('button');
        down.type = 'button'; down.textContent = '↓'; down.disabled = i === items.length - 1;
        down.setAttribute('aria-label', 'Move "' + text + '" down');
        down.addEventListener('click', function () { move(i, 1); });
        li.appendChild(label); li.appendChild(up); li.appendChild(down);
        list.appendChild(li);
      });
    }
    function move(i, d) {
      var t = items[i]; items[i] = items[i + d]; items[i + d] = t;
      marks = null; result.textContent = ''; result.className = 'order-result';
      render();
    }
    controls.querySelector('.order-check').addEventListener('click', function () {
      marks = items.map(function (t, i) { return t === correct[i]; });
      var right = marks.filter(Boolean).length;
      if (right === items.length) { result.textContent = 'Correct! All ' + right + ' steps are in the right order.'; result.className = 'order-result ok'; }
      else { result.textContent = right + ' of ' + items.length + ' are in the right place (green). Move the red ones and check again.'; result.className = 'order-result no'; }
      render();
    });
    controls.querySelector('.order-reset').addEventListener('click', function () {
      shuffle(); marks = null; result.textContent = ''; result.className = 'order-result'; render();
    });
    render();
  }

  /* 4) Motherboard diagram: <div class="mobo-diagram"></div>
     Explore mode: click a part to learn what it is. Quiz mode: find the named part. */
  var MOBO_PARTS = [
    { id: 'io',    name: 'Rear I/O panel', label: 'Rear I/O', anchor: 'start', lx: 10, x: 14,  y: 30,  w: 44,  h: 170, info: 'The ports you see on the back of the case: USB, network (RJ45), audio and the onboard video outputs. It is attached to the motherboard, not the case.' },
    { id: 'cpu8',  name: 'CPU power connector (8-pin)', x: 80, y: 18, w: 60, h: 22, info: 'Extra 12V power from the power supply straight to the CPU. A computer that powers on but shows nothing is often missing this cable.' },
    { id: 'cpu',   name: 'CPU socket', x: 170, y: 70,  w: 120, h: 120, info: 'Holds the processor. Sockets are specific to a CPU family (for example Intel LGA or AMD AM5), so the CPU and motherboard must match. A heatsink and fan sit on top.' },
    { id: 'fan',   name: 'CPU fan header', x: 300, y: 40,  w: 34,  h: 14, info: 'A small 4-pin connector for the CPU cooler fan. Many motherboards warn or refuse to boot if no fan is detected here.' },
    { id: 'ram',   name: 'RAM (DIMM) slots', x: 360, y: 40, w: 70, h: 200, info: 'Hold the memory modules. Desktops use DIMMs (laptops use smaller SO-DIMMs). Install matched pairs in the slots the manual names to get dual-channel speed.' },
    { id: 'atx24', name: '24-pin main power connector', label: '24-pin power', anchor: 'end', lx: 488, x: 456, y: 90, w: 24, h: 120, info: 'The main power cable from the power supply. Without it the board gets no power at all.' },
    { id: 'm2',    name: 'M.2 slot', x: 150, y: 228, w: 150, h: 18, info: 'For M.2 SSDs (and some Wi-Fi cards). Depending on the board, the slot runs NVMe over PCIe, SATA, or both. The card is held down with one small screw.' },
    { id: 'x16',   name: 'PCIe x16 slot', x: 70,  y: 268, w: 290, h: 18, info: 'The long expansion slot, used mainly for graphics cards. It is the slot nearest the CPU, with the most lanes.' },
    { id: 'x1',    name: 'PCIe x1 slot', x: 70,  y: 312, w: 80,  h: 16, info: 'A short expansion slot for small cards such as network, sound or USB cards. A x1 card also fits in a longer slot.' },
    { id: 'chip',  name: 'Chipset', x: 330, y: 318, w: 70, h: 60, info: 'Handles communication between the CPU and many other parts (SATA, USB, extra PCIe lanes). Usually under a flat heatsink.' },
    { id: 'sata',  name: 'SATA ports', x: 430, y: 300, w: 44, h: 80, info: 'Data connectors for SATA hard drives, SSDs and optical drives. Power comes separately from the power supply.' },
    { id: 'cmos',  name: 'CMOS battery', x: 200, y: 345, w: 34, h: 34, round: true, info: 'A coin battery (CR2032) that keeps the clock and BIOS/UEFI settings when the computer is unplugged. A dead one makes the date and time reset at every start.' },
    { id: 'front', name: 'Front-panel header', x: 290, y: 404, w: 80, h: 14, info: 'Small pins that connect the case\'s power button, reset button and lights. If the power button does nothing, check this connection.' }
  ];

  function setupMobo(root) {
    var NS = 'http://www.w3.org/2000/svg';
    var mode = 'explore';
    var target = null;
    var asked = [];
    root.innerHTML =
      '<div class="mobo-modes" role="group" aria-label="Mode">' +
        '<button type="button" data-mode="explore" aria-pressed="true">Explore the parts</button>' +
        '<button type="button" data-mode="quiz" aria-pressed="false">Quiz me</button>' +
      '</div>' +
      '<p class="mobo-prompt" aria-live="polite"></p>' +
      '<div class="mobo-wrap"></div>' +
      '<div class="mobo-info" aria-live="polite"></div>';
    var prompt = root.querySelector('.mobo-prompt');
    var info = root.querySelector('.mobo-info');
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 500 440');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Simplified diagram of a desktop motherboard');
    root.querySelector('.mobo-wrap').appendChild(svg);

    var board = document.createElementNS(NS, 'rect');
    board.setAttribute('x', 4); board.setAttribute('y', 4); board.setAttribute('width', 492); board.setAttribute('height', 432);
    board.setAttribute('rx', 10); board.setAttribute('class', 'mobo-board');
    svg.appendChild(board);

    var shapes = {};
    MOBO_PARTS.forEach(function (p) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'mobo-part');
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      var s;
      if (p.round) {
        s = document.createElementNS(NS, 'circle');
        s.setAttribute('cx', p.x + p.w / 2); s.setAttribute('cy', p.y + p.h / 2); s.setAttribute('r', p.w / 2);
      } else {
        s = document.createElementNS(NS, 'rect');
        s.setAttribute('x', p.x); s.setAttribute('y', p.y); s.setAttribute('width', p.w); s.setAttribute('height', p.h); s.setAttribute('rx', 3);
      }
      g.appendChild(s);
      if (p.id === 'ram') { // draw the four slots
        for (var k = 0; k < 4; k++) {
          var slot = document.createElementNS(NS, 'rect');
          slot.setAttribute('x', p.x + 6 + k * 16); slot.setAttribute('y', p.y + 6); slot.setAttribute('width', 8); slot.setAttribute('height', p.h - 12);
          slot.setAttribute('class', 'mobo-detail');
          g.appendChild(slot);
        }
      }
      if (p.id === 'cpu') {
        var inner = document.createElementNS(NS, 'rect');
        inner.setAttribute('x', p.x + 25); inner.setAttribute('y', p.y + 25); inner.setAttribute('width', p.w - 50); inner.setAttribute('height', p.h - 50);
        inner.setAttribute('class', 'mobo-detail');
        g.appendChild(inner);
      }
      var label = document.createElementNS(NS, 'text');
      label.setAttribute('x', p.lx != null ? p.lx : p.x + p.w / 2);
      if (p.anchor) label.setAttribute('style', 'text-anchor:' + p.anchor);
      label.setAttribute('y', p.id === 'io' || p.id === 'atx24' || p.id === 'ram' || p.id === 'sata' ? p.y + p.h + 14 : p.y + p.h / 2 + 4);
      if (p.id === 'cpu8' || p.id === 'fan' || p.id === 'front') label.setAttribute('y', p.y - 5);
      if (p.id === 'cmos') label.setAttribute('y', p.y + p.h + 14);
      label.setAttribute('class', 'mobo-label');
      label.textContent = p.label || p.name.replace(' (8-pin)', '').replace(' connector', '').replace(' (DIMM)', '');
      g.appendChild(label);
      g.setAttribute('aria-label', p.name);
      g.addEventListener('click', function () { pick(p); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(p); } });
      svg.appendChild(g);
      shapes[p.id] = g;
    });

    function clearMarks() { Object.keys(shapes).forEach(function (k) { shapes[k].classList.remove('selected', 'right', 'wrong'); }); }

    function pick(p) {
      clearMarks();
      if (mode === 'explore') {
        shapes[p.id].classList.add('selected');
        info.innerHTML = '<strong></strong><p></p>';
        info.querySelector('strong').textContent = p.name;
        info.querySelector('p').textContent = p.info;
        return;
      }
      if (!target) return;
      if (p.id === target.id) {
        shapes[p.id].classList.add('right');
        info.innerHTML = '<strong class="ok">Correct: </strong><span></span> <button type="button" class="mobo-next">Next part</button>';
        info.querySelector('span').textContent = p.name + '. ' + p.info;
        info.querySelector('.mobo-next').addEventListener('click', nextQuestion);
        target = null;
      } else {
        shapes[p.id].classList.add('wrong');
        info.innerHTML = '<strong class="no">Not quite.</strong> <span></span>';
        info.querySelector('span').textContent = 'That is the ' + p.name + '. Try again.';
      }
    }

    function nextQuestion() {
      clearMarks();
      if (asked.length === MOBO_PARTS.length) asked = [];
      var left = MOBO_PARTS.filter(function (p) { return asked.indexOf(p.id) < 0; });
      target = left[Math.floor(Math.random() * left.length)];
      asked.push(target.id);
      prompt.textContent = 'Find the ' + target.name + '. (' + asked.length + ' of ' + MOBO_PARTS.length + ')';
      info.innerHTML = '';
    }

    function setMode(m) {
      mode = m;
      root.classList.toggle('quiz', m === 'quiz');
      Array.prototype.forEach.call(root.querySelectorAll('.mobo-modes button'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-mode') === m ? 'true' : 'false');
      });
      clearMarks(); info.innerHTML = '';
      if (m === 'quiz') { asked = []; nextQuestion(); }
      else { target = null; prompt.textContent = 'Click any part to see what it is and what it does.'; }
    }
    Array.prototype.forEach.call(root.querySelectorAll('.mobo-modes button'), function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
    });
    setMode('explore');
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('.check'), setupCheck);
    Array.prototype.forEach.call(document.querySelectorAll('.raid-sim'), setupRaid);
    Array.prototype.forEach.call(document.querySelectorAll('.order-steps'), setupOrder);
    Array.prototype.forEach.call(document.querySelectorAll('.mobo-diagram'), setupMobo);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
