import { NewProblem } from '../types';

/**
 * The "Blind 75" — the original curated 75-problem interview list.
 *
 * Titles and URLs are kept identical to their NeetCode 150 counterparts so that seeding
 * attaches a `Blind 75` membership to the same problem row (dedup is by title + URL)
 * rather than creating a duplicate. If you edit one, keep the other in sync.
 */
export const BLIND_75: NewProblem[] = [
  // Arrays & Hashing
  { title: 'Contains Duplicate', topic: 'Arrays', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/contains-duplicate/', list_name: 'Blind 75' },
  { title: 'Valid Anagram', topic: 'Arrays', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/valid-anagram/', list_name: 'Blind 75' },
  { title: 'Two Sum', topic: 'Arrays', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/two-sum/', list_name: 'Blind 75' },
  { title: 'Group Anagrams', topic: 'Arrays', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/group-anagrams/', list_name: 'Blind 75' },
  { title: 'Top K Frequent Elements', topic: 'Arrays', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/top-k-frequent-elements/', list_name: 'Blind 75' },
  { title: 'Product of Array Except Self', topic: 'Arrays', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/product-of-array-except-self/', list_name: 'Blind 75' },
  { title: 'Encode and Decode Strings', topic: 'Arrays', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/encode-and-decode-strings/', list_name: 'Blind 75' },
  { title: 'Longest Consecutive Sequence', topic: 'Arrays', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/longest-consecutive-sequence/', list_name: 'Blind 75' },

  // Two Pointers
  { title: 'Valid Palindrome', topic: 'Two Pointers', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/valid-palindrome/', list_name: 'Blind 75' },
  { title: '3Sum', topic: 'Two Pointers', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/3sum/', list_name: 'Blind 75' },
  { title: 'Container With Most Water', topic: 'Two Pointers', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/container-with-most-water/', list_name: 'Blind 75' },

  // Sliding Window
  { title: 'Best Time to Buy and Sell Stock', topic: 'Sliding Window', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', list_name: 'Blind 75' },
  { title: 'Longest Substring Without Repeating Characters', topic: 'Sliding Window', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', list_name: 'Blind 75' },
  { title: 'Longest Repeating Character Replacement', topic: 'Sliding Window', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/longest-repeating-character-replacement/', list_name: 'Blind 75' },
  { title: 'Minimum Window Substring', topic: 'Sliding Window', difficulty: 'Hard', leetcode_url: 'https://leetcode.com/problems/minimum-window-substring/', list_name: 'Blind 75' },

  // Stack
  { title: 'Valid Parentheses', topic: 'Stack', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/valid-parentheses/', list_name: 'Blind 75' },

  // Binary Search
  { title: 'Find Minimum in Rotated Sorted Array', topic: 'Binary Search', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/', list_name: 'Blind 75' },
  { title: 'Search in Rotated Sorted Array', topic: 'Binary Search', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/', list_name: 'Blind 75' },

  // Linked List
  { title: 'Reverse Linked List', topic: 'Linked List', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/reverse-linked-list/', list_name: 'Blind 75' },
  { title: 'Merge Two Sorted Lists', topic: 'Linked List', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/merge-two-sorted-lists/', list_name: 'Blind 75' },
  { title: 'Reorder List', topic: 'Linked List', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/reorder-list/', list_name: 'Blind 75' },
  { title: 'Remove Nth Node From End of List', topic: 'Linked List', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/', list_name: 'Blind 75' },
  { title: 'Linked List Cycle', topic: 'Linked List', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/linked-list-cycle/', list_name: 'Blind 75' },
  { title: 'Merge K Sorted Lists', topic: 'Linked List', difficulty: 'Hard', leetcode_url: 'https://leetcode.com/problems/merge-k-sorted-lists/', list_name: 'Blind 75' },

  // Trees
  { title: 'Invert Binary Tree', topic: 'Trees', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/invert-binary-tree/', list_name: 'Blind 75' },
  { title: 'Maximum Depth of Binary Tree', topic: 'Trees', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/', list_name: 'Blind 75' },
  { title: 'Same Tree', topic: 'Trees', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/same-tree/', list_name: 'Blind 75' },
  { title: 'Subtree of Another Tree', topic: 'Trees', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/subtree-of-another-tree/', list_name: 'Blind 75' },
  { title: 'Lowest Common Ancestor of a Binary Search Tree', topic: 'Trees', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/', list_name: 'Blind 75' },
  { title: 'Binary Tree Level Order Traversal', topic: 'Trees', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/', list_name: 'Blind 75' },
  { title: 'Validate Binary Search Tree', topic: 'Trees', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/validate-binary-search-tree/', list_name: 'Blind 75' },
  { title: 'Kth Smallest Element in a BST', topic: 'Trees', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/', list_name: 'Blind 75' },
  { title: 'Construct Binary Tree from Preorder and Inorder Traversal', topic: 'Trees', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/', list_name: 'Blind 75' },
  { title: 'Binary Tree Maximum Path Sum', topic: 'Trees', difficulty: 'Hard', leetcode_url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/', list_name: 'Blind 75' },
  { title: 'Serialize and Deserialize Binary Tree', topic: 'Trees', difficulty: 'Hard', leetcode_url: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/', list_name: 'Blind 75' },

  // Tries
  { title: 'Implement Trie Prefix Tree', topic: 'Tries', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/implement-trie-prefix-tree/', list_name: 'Blind 75' },
  { title: 'Design Add and Search Words Data Structure', topic: 'Tries', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/', list_name: 'Blind 75' },
  { title: 'Word Search II', topic: 'Tries', difficulty: 'Hard', leetcode_url: 'https://leetcode.com/problems/word-search-ii/', list_name: 'Blind 75' },

  // Heap / Priority Queue
  { title: 'Find Median from Data Stream', topic: 'Heap', difficulty: 'Hard', leetcode_url: 'https://leetcode.com/problems/find-median-from-data-stream/', list_name: 'Blind 75' },

  // Backtracking
  { title: 'Combination Sum', topic: 'Backtracking', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/combination-sum/', list_name: 'Blind 75' },
  { title: 'Word Search', topic: 'Backtracking', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/word-search/', list_name: 'Blind 75' },

  // Graphs
  { title: 'Number of Islands', topic: 'Graphs', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/number-of-islands/', list_name: 'Blind 75' },
  { title: 'Clone Graph', topic: 'Graphs', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/clone-graph/', list_name: 'Blind 75' },
  { title: 'Pacific Atlantic Water Flow', topic: 'Graphs', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/pacific-atlantic-water-flow/', list_name: 'Blind 75' },
  { title: 'Course Schedule', topic: 'Graphs', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/course-schedule/', list_name: 'Blind 75' },
  { title: 'Number of Connected Components in an Undirected Graph', topic: 'Graphs', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/', list_name: 'Blind 75' },
  { title: 'Graph Valid Tree', topic: 'Graphs', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/graph-valid-tree/', list_name: 'Blind 75' },
  { title: 'Alien Dictionary', topic: 'Graphs', difficulty: 'Hard', leetcode_url: 'https://leetcode.com/problems/alien-dictionary/', list_name: 'Blind 75' },

  // Dynamic Programming
  { title: 'Climbing Stairs', topic: 'Dynamic Programming', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/climbing-stairs/', list_name: 'Blind 75' },
  { title: 'House Robber', topic: 'Dynamic Programming', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/house-robber/', list_name: 'Blind 75' },
  { title: 'House Robber II', topic: 'Dynamic Programming', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/house-robber-ii/', list_name: 'Blind 75' },
  { title: 'Longest Palindromic Substring', topic: 'Dynamic Programming', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/longest-palindromic-substring/', list_name: 'Blind 75' },
  { title: 'Palindromic Substrings', topic: 'Dynamic Programming', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/palindromic-substrings/', list_name: 'Blind 75' },
  { title: 'Decode Ways', topic: 'Dynamic Programming', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/decode-ways/', list_name: 'Blind 75' },
  { title: 'Coin Change', topic: 'Dynamic Programming', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/coin-change/', list_name: 'Blind 75' },
  { title: 'Maximum Product Subarray', topic: 'Dynamic Programming', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/maximum-product-subarray/', list_name: 'Blind 75' },
  { title: 'Word Break', topic: 'Dynamic Programming', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/word-break/', list_name: 'Blind 75' },
  { title: 'Longest Increasing Subsequence', topic: 'Dynamic Programming', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/longest-increasing-subsequence/', list_name: 'Blind 75' },
  { title: 'Unique Paths', topic: 'Dynamic Programming', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/unique-paths/', list_name: 'Blind 75' },
  { title: 'Longest Common Subsequence', topic: 'Dynamic Programming', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/longest-common-subsequence/', list_name: 'Blind 75' },

  // Greedy
  { title: 'Maximum Subarray', topic: 'Greedy', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/maximum-subarray/', list_name: 'Blind 75' },
  { title: 'Jump Game', topic: 'Greedy', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/jump-game/', list_name: 'Blind 75' },

  // Intervals
  { title: 'Insert Interval', topic: 'Intervals', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/insert-interval/', list_name: 'Blind 75' },
  { title: 'Merge Intervals', topic: 'Intervals', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/merge-intervals/', list_name: 'Blind 75' },
  { title: 'Non-overlapping Intervals', topic: 'Intervals', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/non-overlapping-intervals/', list_name: 'Blind 75' },
  { title: 'Meeting Rooms', topic: 'Intervals', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/meeting-rooms/', list_name: 'Blind 75' },
  { title: 'Meeting Rooms II', topic: 'Intervals', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/meeting-rooms-ii/', list_name: 'Blind 75' },

  // Math & Geometry
  { title: 'Rotate Image', topic: 'Math', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/rotate-image/', list_name: 'Blind 75' },
  { title: 'Spiral Matrix', topic: 'Math', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/spiral-matrix/', list_name: 'Blind 75' },
  { title: 'Set Matrix Zeroes', topic: 'Math', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/set-matrix-zeroes/', list_name: 'Blind 75' },

  // Bit Manipulation
  { title: 'Number of 1 Bits', topic: 'Bit Manipulation', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/number-of-1-bits/', list_name: 'Blind 75' },
  { title: 'Counting Bits', topic: 'Bit Manipulation', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/counting-bits/', list_name: 'Blind 75' },
  { title: 'Reverse Bits', topic: 'Bit Manipulation', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/reverse-bits/', list_name: 'Blind 75' },
  { title: 'Missing Number', topic: 'Bit Manipulation', difficulty: 'Easy', leetcode_url: 'https://leetcode.com/problems/missing-number/', list_name: 'Blind 75' },
  { title: 'Sum of Two Integers', topic: 'Bit Manipulation', difficulty: 'Medium', leetcode_url: 'https://leetcode.com/problems/sum-of-two-integers/', list_name: 'Blind 75' },
];
