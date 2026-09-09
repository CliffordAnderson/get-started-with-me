#!/usr/bin/env python3
"""Check local references, lesson structure, generated definitions and JS syntax."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import re,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=[];self.refs=[];self.panels=[];self.terms=[];self.icons=[]
    def handle_starttag(self,t,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if t=='section' and 'panel' in a.get('class','').split():self.panels.append(a['id'])
        if t in ('a','link','script','img'):
            ref=a.get('href',a.get('src'))
            if ref:self.refs.append(ref)
        if t=='link' and 'icon' in a.get('rel','').split():self.icons.append(a.get('href',''))
        if t=='a' and 'term' in a.get('class','').split():self.terms.append(a['href'])
pages={};issues=[];script_count=0
for p in ROOT.rglob('*.html'):
    scan=Page();scan.feed(p.read_text());pages[p.resolve()]=scan
for p,scan in pages.items():
    if len(scan.ids)!=len(set(scan.ids)):issues.append(f'{p.name}: duplicate ids')
    for kind in ('favicon.ico','favicon.svg'):
        if not any(h.endswith(kind) for h in scan.icons):issues.append(f'{p.name}: no <link rel="icon"> for {kind}')
    for ref in scan.refs:
        u=urlsplit(ref)
        if u.scheme or u.netloc:continue
        target=(p.parent/unquote(u.path)).resolve() if u.path else p
        if not target.exists():issues.append(f'{p.name}: missing {ref}')
        elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:issues.append(f'{p.name}: missing anchor {ref}')
    s=p.read_text()
    if scan.panels:
        m=re.search(r'initPanels\(\[(.*?)\]\);',s,re.S)
        order=re.findall(r'\["([^"]+)",',m[1]) if m else []
        if order!=scan.panels:issues.append(f'{p.name}: panel order mismatch')
        for cls in ['experiment-prompt','takeaway']:
            if s.count('class="'+cls+'"')!=len(scan.panels):issues.append(f'{p.name}: missing {cls}')
        for ref in scan.terms:
            if urlsplit(ref).fragment not in pages[(ROOT/'glossary.html').resolve()].ids:issues.append(f'{p.name}: missing definition {ref}')
    for script in re.findall(r'<script>(.*?)</script>',s,re.S):
        r=subprocess.run(['node','--check'],input=script,text=True,capture_output=True);script_count+=1
        if r.returncode:issues.append(f'{p.name}: {r.stderr}')
for p in (ROOT/'assets').glob('*.js'):
    r=subprocess.run(['node','--check',str(p)],text=True,capture_output=True);script_count+=1
    if r.returncode:issues.append(r.stderr)
r=subprocess.run([sys.executable,str(ROOT/'scripts/build-glossary.py'),'--check'])
if r.returncode:issues.append('Generated glossary mismatch')
r=subprocess.run([sys.executable,str(ROOT/'scripts/make-favicon.py'),'--check'],capture_output=True,text=True)
if r.returncode:issues.append('favicon.ico or favicon.svg is stale: run python3 scripts/make-favicon.py')
else:print(r.stdout.strip())
if issues:print('\n'.join(issues));sys.exit(1)
print(f'{len(pages)} pages: local files, anchors and panel guidance valid; {script_count} scripts pass syntax checks.')
