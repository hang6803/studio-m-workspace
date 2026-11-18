#!/bin/zsh
# WindowServer CPU: top -l 4 -s 2, mean of samples 2-4 (top's first sample is not a real reading)
LOCK="/Users/studiom/Library/Application Support/Claude/side-session-notes/local_f9cbe8d8-c134-4549-8ced-9066fd0c6485/ws-measure.lock"
U="http://127.0.0.1:8765/spikes/xiaom-canvas/index.html"
WK=/private/tmp/claude-501/-Users-studiom-AI-project/c0ac840e-07f5-44b5-a469-c0e19589f5ef/scratchpad/wk/wk
echo "xiaom-canvas spike $(date +%H:%M:%S)" > "$LOCK"
ws(){ top -l 4 -s 2 -stats command,cpu -o cpu | awk '/^COMMAND/{n++} n>=2 && /^WindowServer/{s+=$2;c++} END{printf "%.1f", s/c}'; }
quitS(){ osascript -e 'tell application "Safari" to quit' >/dev/null 2>&1; while pgrep -x Safari >/dev/null; do sleep .5; done; sleep 3; }
for round in 1 2; do
  quitS; echo "r$round baseline(no Safari): $(ws)"
  for v in "none:show=none" "css-112:show=css&size=112" "canvas-112:show=canvas&size=112" "css-229:show=css&size=229" "canvas-229:show=canvas&size=229" "css-both:show=css" "canvas-both:show=canvas"; do
    n=${v%%:*}; q=${v#*:}
    open -a Safari "$U?$q&ui=0"; sleep 7; echo "r$round safari $n: $(ws)"; quitS
  done
  for v in "none:show=none" "css-112:show=css&size=112" "canvas-112:show=canvas&size=112" "css-229:show=css&size=229" "canvas-229:show=canvas&size=229"; do
    n=${v%%:*}; q=${v#*:}
    $WK "$U?$q&ui=0" >/dev/null 2>&1 & P=$!; sleep 6; echo "r$round wkwebview $n: $(ws)"; kill $P; sleep 3
  done
done
quitS; rm -f "$LOCK"; echo done $(date +%H:%M:%S)
