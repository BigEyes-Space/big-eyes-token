// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./MemoryLib.sol";

library StringsLib {
    struct Data {
        mapping(bytes1 => string) encodeMap;
    }

    function concat(string memory r, string memory l)
        public
        pure
        returns (string memory)
    {
        uint256 ptr_r;
        uint256 ptr_l;
        assembly {
            ptr_r := r
            ptr_l := l
        }
        uint256 ptr = MemoryLib.memcat(ptr_r, ptr_l);
        uint256 len;
        assembly {
            len := mload(ptr)
        }
        string memory rt;
        assembly {
            rt := ptr
        }
        return rt;
    }

    function find(
        string memory str,
        string memory target,
        uint256 pos
    ) internal pure returns (int256) {
        uint256 ptr_str;
        uint256 ptr_target;
        assembly {
            ptr_str := str
            ptr_target := target
        }
        return MemoryLib.find(ptr_str, ptr_target, pos);
    }

    function remove(
        string memory str,
        string memory target,
        int256 count
    ) internal pure returns (string memory) {
        uint256 ptr_str;
        uint256 ptr_target;
        uint256 len_target;
        assembly {
            ptr_str := str
            ptr_target := target
            len_target := mload(target)
        }
        for (;;) {
            int256 pos = MemoryLib.find(ptr_str, ptr_target, 0);
            if (pos >= 0) {
                MemoryLib.memcut(ptr_str, uint256(pos), len_target);
                if (count > 0) {
                    count--;
                    if (count < 1) {
                        break;
                    }
                }
                continue;
            }
            break;
        }
        return str;
    }

    function contains(string memory str, string memory target)
        internal
        pure
        returns (bool)
    {
        return find(str, target, 0) > -1;
    }

    function startwith(string memory str, string memory target)
        internal
        pure
        returns (bool)
    {
        return find(str, target, 0) == 0;
    }

    function endwith(string memory str, string memory target)
        internal
        pure
        returns (bool)
    {
        uint256 pos = bytes(str).length - bytes(target).length;
        return find(str, target, pos) == int256(pos);
    }

    event P(uint256 v, string k);

    function replace(
        string memory str,
        string memory a,
        string memory b,
        int256 count
    ) internal pure returns (string memory) {
        uint256 len_a;
        uint256 len_b;
        uint256 len_str;
        uint256 ptr_str;
        uint256 ptr_a;
        uint256 ptr_b;

        assembly {
            ptr_str := str
            ptr_a := a
            ptr_b := b
            len_a := mload(a)
            len_b := mload(b)
            len_str := mload(str)
        }
        if (len_b == 0) {
            return str;
        }
        if (len_str < len_a) {
            return str;
        }
        int256 pos = MemoryLib.find(ptr_str, ptr_a, 0);
        if (pos < 0) {
            return str;
        }
        if (len_a >= len_b) {
            for (
                uint256 times = 0;
                pos >= 0;
                pos = MemoryLib.find(ptr_str, ptr_a, uint256(pos) + len_b)
            ) {
                MemoryLib.memcpy(
                    ptr_str + 0x20 + uint256(pos),
                    ptr_b + 0x20,
                    len_b
                );
                MemoryLib.memcpy(
                    ptr_str + 0x20 + uint256(pos) + len_b,
                    ptr_str + 0x20 + uint256(pos) + len_a,
                    len_str - uint256(pos) - len_a
                );
                len_str = len_str - len_a + len_b;
                assembly {
                    mstore(ptr_str, len_str)
                }
                if (count > 0) {
                    count--;
                    if (count == 0) {
                        break;
                    }
                }
                times++;
            }
            return str;
        } else {
            uint256 ptr = MemoryLib.calloc(
                len_str + (len_str / len_a) * (len_b - len_a)
            );
            uint256 size = 0;
            int256 last_cpy_pos = 0;
            for (
                ;
                pos >= 0;
                pos = MemoryLib.find(ptr_str, ptr_a, uint256(pos) + len_a)
            ) {
                MemoryLib.memcpy(
                    ptr + 0x20 + size,
                    ptr_str + 0x20 + uint256(last_cpy_pos),
                    uint256(pos - last_cpy_pos)
                );
                size += uint256(pos - last_cpy_pos);
                MemoryLib.memcpy(ptr + size + 0x20, ptr_b + 0x20, len_b);
                last_cpy_pos = pos + int256(len_a);
                size += uint256(len_b);
                if (count > 0) {
                    count--;
                    if (count == 0) {
                        break;
                    }
                }
            }
            MemoryLib.memcpy(
                ptr + 0x20 + size,
                ptr_str + 0x20 + uint256(last_cpy_pos),
                len_str - uint256(last_cpy_pos)
            );
            size += len_str - uint256(last_cpy_pos);
            assembly {
                mstore(ptr, size)
                str := ptr
            }
        }
        return str;
    }

    function len(string memory str) internal pure returns (uint256) {
        uint256 ptr;
        uint256 len;
        assembly {
            ptr := add(str, 0x20)
            len := mload(str)
        }
        uint256 val;
        uint256 pos;
        uint256 runes = 0;
        for (; pos < len; ) {
            assembly {
                val := and(0xff, mload(add(ptr, pos)))
            }
            if (val < 0x80) {
                pos += 1;
            } else if (val < 0xE0) {
                pos += 2;
            } else if (val < 0xF0) {
                pos += 3;
            } else if (val < 0xF8) {
                pos += 4;
            } else if (val < 0xFC) {
                pos += 5;
            } else {
                pos += 6;
            }
            runes++;
        }
        return runes;
    }

    function urlEncode(string memory str, Data storage self)
        internal
        returns (string memory)
    {
        // Unsafe Characters Encoding
        self.encodeMap[" "] = "%20";
        self.encodeMap['"'] = "%22";
        self.encodeMap["<"] = "%3c";
        self.encodeMap[">"] = "%3e";
        self.encodeMap["#"] = "%23";
        self.encodeMap["%"] = "%25";
        self.encodeMap["{"] = "%7b";
        self.encodeMap["}"] = "%7d";
        self.encodeMap["|"] = "%7c";
        self.encodeMap["\\"] = "%5c";
        self.encodeMap["^"] = "%5e";
        self.encodeMap["~"] = "%7e";
        self.encodeMap["["] = "%5b";
        self.encodeMap["]"] = "%5d";
        self.encodeMap["`"] = "%60";
        // Reserved Characters Encoding
        self.encodeMap["$"] = "%24";
        self.encodeMap["&"] = "%26";
        self.encodeMap["+"] = "%2b";
        self.encodeMap[","] = "%2c";
        self.encodeMap["/"] = "%2f";
        self.encodeMap[":"] = "%3a";
        self.encodeMap[";"] = "%3b";
        self.encodeMap["="] = "%3d";
        self.encodeMap["?"] = "%3f";
        self.encodeMap["@"] = "%40";

        bytes memory inputString = bytes(str);
        bytes memory workingString = inputString;
        for (uint256 i = 0; i < inputString.length; i++) {
            bytes1 character = inputString[i];
            string memory substitution = self.encodeMap[character];
            if (len(substitution) != 0) {
                string memory theCharacter = new string(1);
                bytes memory bytesString = bytes(theCharacter);
                bytesString[0] = character;
                workingString = bytes(
                    replace(
                        string(workingString),
                        string(bytesString),
                        substitution,
                        0
                    )
                );
            }
        }
        return string(workingString);
    }
}
