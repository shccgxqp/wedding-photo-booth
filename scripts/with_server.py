#!/usr/bin/env python3
"""
Start one or more servers, wait for them to be ready, run a command, then clean up.

Usage:
  python scripts/with_server.py --server "npm run dev" --port 5173 -- python test.py
"""

import subprocess
import socket
import time
import sys
import argparse


def is_server_ready(port, timeout=30):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection(('localhost', port), timeout=1):
                return True
        except (socket.error, ConnectionRefusedError):
            time.sleep(0.5)
    return False


def main():
    parser = argparse.ArgumentParser(description='Run command with one or more servers')
    parser.add_argument('--server', action='append', dest='servers', required=True)
    parser.add_argument('--port', action='append', dest='ports', type=int, required=True)
    parser.add_argument('--timeout', type=int, default=30)
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()

    if args.command and args.command[0] == '--':
        args.command = args.command[1:]
    if not args.command:
        print("Error: No command specified")
        sys.exit(1)
    if len(args.servers) != len(args.ports):
        print("Error: --server and --port count must match")
        sys.exit(1)

    servers = [{'cmd': cmd, 'port': port} for cmd, port in zip(args.servers, args.ports)]
    server_processes = []

    try:
        for i, server in enumerate(servers):
            print(f"Starting server {i+1}: {server['cmd']}")
            process = subprocess.Popen(server['cmd'], shell=True,
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            server_processes.append(process)
            print(f"Waiting for port {server['port']}...")
            if not is_server_ready(server['port'], timeout=args.timeout):
                raise RuntimeError(f"Server not ready on port {server['port']}")
            print(f"Ready on port {server['port']}")

        print(f"\nAll servers ready. Running: {' '.join(args.command)}\n")
        result = subprocess.run(args.command)
        sys.exit(result.returncode)
    finally:
        for i, process in enumerate(server_processes):
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            print(f"Server {i+1} stopped")


if __name__ == '__main__':
    main()
