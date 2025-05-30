import re, sys

def decode(encoded_str):
    if not encoded_str.startswith("LOL!"):
        return b''
    
    hex_data, output, repeat, pos = encoded_str[4:].encode('ascii'), bytearray(), 0, 0
    
    while pos < len(hex_data):
        if pos + 1 < len(hex_data) and hex_data[pos+1] == 81:
            repeat = int(chr(hex_data[pos]), 16) if chr(hex_data[pos]).isdigit() else 0
            pos += 2
            continue

        if pos + 1 < len(hex_data):
            try:
                byte_val = ((hex_data[pos] - 48 - 7*(hex_data[pos] > 64)) * 16) + (hex_data[pos+1] - 48 - 7*(hex_data[pos+1] > 64))
                output.extend(bytes([byte_val]) * repeat if repeat else [byte_val])
                repeat = 0
            except:
                pass
            pos += 2
        else:
            pos += 1
    
    return bytes(output)

def main():
    if len(sys.argv) < 2:
        sys.exit(1)

    try:
        with open(sys.argv[1], 'rb') as f:
            if not (encoded_str := next((re.search(p, f.read().decode('utf-8', 'replace'), re.I | re.S) for p in [
                r'end\s*return\s*(?:v\d+|VMCall)\s*\(\s*"([^"]+)"',
                r'v\d+\s*\(\s*"([^"]+)"\s*,\s*v\d+\(\)\s*,\s*\.\.\.\s*\)',
                r'\)\s*\)\s*end\s*\)\s*\)\s*end\s*return\s*[^"]*"([^"]+)"'
            ] if p), None)):
                sys.exit(1)

        if not (decoded := decode(encoded_str.group(1))):
            sys.exit(1)

        with open('keyloggerchecker.log', 'wb') as f:
            f.write(decoded)
    except:
        sys.exit(1)

if __name__ == "__main__":
    main()