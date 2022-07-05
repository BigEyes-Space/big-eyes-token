// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

library MemoryLib {
    function memcpy(
        uint256 ptr_dest,
        uint256 ptr_src,
        uint256 length
    ) internal pure {
        for (; length >= 0x20; length -= 0x20) {
            assembly {
                mstore(ptr_dest, mload(ptr_src))
                ptr_src := add(ptr_src, 0x20)
                ptr_dest := add(ptr_dest, 0x20)
            }
        }
        assembly {
            let mask := sub(exp(256, sub(32, length)), 1)
            let a := and(mload(ptr_src), not(mask))
            let b := and(mload(ptr_dest), mask)
            mstore(ptr_dest, or(a, b))
        }
    }

    function memcat(uint256 ptr_l, uint256 ptr_r)
        internal
        pure
        returns (uint256)
    {
        uint256 len_l;
        uint256 len_r;
        uint256 length;
        assembly {
            len_l := mload(ptr_l)
            len_r := mload(ptr_r)
            ptr_l := add(ptr_l, 0x20)
            ptr_r := add(ptr_r, 0x20)
            length := add(len_r, len_l)
        }
        uint256 rt = calloc(length);
        uint256 ptr = rt + 32;
        memcpy(ptr, ptr_l, len_l);
        ptr += len_l;
        memcpy(ptr, ptr_r, len_r);
        assembly {
            length := mload(rt)
        }
        return rt;
    }

    function memcut(
        uint256 ptr,
        uint256 pos,
        uint256 size
    ) internal pure {
        uint256 len;
        assembly {
            len := mload(ptr)
            ptr := add(ptr, 0x20)
        }
        if (len < pos + size) {
            return;
        }
        memcpy(ptr + pos, ptr + pos + size, len - size - pos);
        assembly {
            mstore(sub(ptr, 0x20), sub(len, size))
        }
    }

    function calloc(uint256 size) internal pure returns (uint256 ptr) {
        assembly {
            ptr := mload(0x40)
            mstore(ptr, size)
            mstore(0x40, add(ptr, add(size, 0x20)))
        }
        return ptr;
    }

    function find(
        uint256 ptr,
        uint256 target,
        uint256 pos
    ) internal pure returns (int256) {
        uint256 target_len;
        uint256 ptr_len;

        assembly {
            target_len := mload(target)
            ptr_len := mload(ptr)
            ptr := add(ptr, add(32, pos))
            target := add(target, 0x20)
        }
        if (pos > ptr_len || target_len + pos > ptr_len) {
            return -1;
        }
        uint256 find_end = ptr_len - target_len + 1;
        uint256 target_val;
        uint256 mask = ~(256**(32 - target_len) - 1);
        assembly {
            target_val := and(mload(target), mask)
        }
        uint256 ptr_val;
        for (; pos < find_end; pos++) {
            assembly {
                ptr_val := and(mload(ptr), mask)
                ptr := add(ptr, 1)
            }
            if (target_val == ptr_val) {
                return int256(pos);
            }
        }
        return -1;
    }
}
