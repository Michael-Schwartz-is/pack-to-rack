"""Local UI for Sample Pack to Drum Rack. Run with python3 app.py."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import secrets
import subprocess
import sys
import threading
from urllib.parse import urlsplit, parse_qs
import webbrowser
from rack import BASE, scan, build

TOKEN = secrets.token_urlsafe(32)
PLANS = {}
EXPORTS = set()

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def send(self,status,data,kind='application/json'):
        raw=json.dumps(data,ensure_ascii=False).encode() if kind=='application/json' else data
        self.send_response(status)
        self.send_header('Content-Type',kind)
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.end_headers(); self.wfile.write(raw)
    def trusted(self):
        host=self.headers.get('Host','')
        return host in {f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
    def do_GET(self):
        if not self.trusted(): return self.send(403,{'error':'Invalid host'})
        url=urlsplit(self.path)
        if url.path=='/':
            html=(BASE/'web/index.html').read_text().replace('__TOKEN__',TOKEN)
            return self.send(200,html.encode(),'text/html; charset=utf-8')
        self.send(404,{'error':'Not found'})
    def do_POST(self):
        origin=self.headers.get('Origin')
        expected=f'http://{self.headers.get("Host","")}'
        if not self.trusted() or self.headers.get('X-Rack-Token')!=TOKEN or (origin and origin!=expected):
            return self.send(403,{'error':'Invalid local session'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0 < length <= 8_000_000: raise ValueError('Invalid request size')
            data=json.loads(self.rfile.read(length))
            if self.path=='/api/choose':
                if sys.platform!='darwin': raise ValueError('Paste a folder path on this operating system.')
                # Native folder picker; scripts contain no user-supplied code.
                proc=subprocess.run(['osascript','-e','POSIX path of (choose folder with prompt "Choose a sample pack folder")'],capture_output=True,text=True)
                self.send(200,{'path':proc.stdout.strip() if proc.returncode==0 else None})
            elif self.path=='/api/scan':
                plan=scan(data['folder'],bool(data.get('include_loops')))
                key=secrets.token_urlsafe(16); PLANS[key]=plan
                # Bound memory to recent previews; full scan lives on this machine.
                if len(PLANS)>20: del PLANS[next(iter(PLANS))]
                self.send(200,{**plan,'id':key})
            elif self.path=='/api/build':
                plan=PLANS.get(data['id'])
                if plan is None: raise ValueError('Preview expired. Scan the folder again.')
                result=build(plan,data.get('output') or str(BASE/'exports'),data.get('assignments'),bool(data.get('copy_samples',True)),data.get('name'))
                EXPORTS.add(result['directory']); self.send(200,result)
            elif self.path=='/api/reveal':
                path=data['directory']
                if path not in EXPORTS: raise ValueError('Choose an export created in this session.')
                if sys.platform=='darwin': subprocess.run(['open',path],check=True)
                self.send(200,{'ok':True})
            else: self.send(404,{'error':'Not found'})
        except (ValueError,KeyError,OSError,json.JSONDecodeError,subprocess.SubprocessError) as e:
            self.send(400,{'error':str(e)})
        except Exception:
            import traceback; traceback.print_exc()
            self.send(500,{'error':'Export failed. Details are in the launch terminal.'})


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=0)
    parser.add_argument('--no-browser',action='store_true')
    args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    url=f'http://127.0.0.1:{server.server_port}/'
    print(f'Sample Pack to Drum Rack: {url}',flush=True)
    if not args.no_browser: threading.Timer(.4,lambda:webbrowser.open(url)).start()
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()

if __name__=='__main__': main()
