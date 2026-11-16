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

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('.check'), setupCheck);
    Array.prototype.forEach.call(document.querySelectorAll('.raid-sim'), setupRaid);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
