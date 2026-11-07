export interface SampleCurriculum {
  id: string;
  title: string;
  category: string;
  text: string;
}

export const SAMPLE_CURRICULA: SampleCurriculum[] = [
  {
    id: 'dsa_core',
    title: 'Data Structures & Algorithms',
    category: 'Core Computer Science',
    text: `An Array is a contiguous memory allocation that provides constant-time indexed access.
A Linked List is a linear collection of data elements whose order is not given by their physical placement in memory. Instead, each element points to the next. Linked Lists are foundational to Dynamic Memory and Stacks.
A Stack is a LIFO (Last In First Out) linear abstract data structure used in call stacks and depth-first traversals. A Stack depends on Array or Linked List implementations.
A Queue is a FIFO (First In First Out) linear data structure used in breadth-first exploration and process scheduling. A Queue depends on Array or Linked List foundations.
A Binary Tree is a hierarchical non-linear tree data structure where each node has at most two children. Binary Trees require understanding of Linked Lists.
A Binary Search Tree is a variant of Binary Tree where left child values are smaller and right child values are larger. Binary Search Trees depend on Binary Trees.
A Heap is a complete binary tree that satisfies the heap property, enabling an efficient Priority Queue with logarithmic insertion and extraction. Heaps are built upon Arrays.
A Graph is a non-linear network consisting of a set of vertices and edges. Graphs can be represented using an Adjacency Matrix or an Adjacency List. Graphs require understanding of Trees and Arrays.
Breadth First Search is a graph traversal algorithm that explores neighbor nodes level by level using a Queue. Breadth First Search requires a Queue and a Graph.
Depth First Search is a graph traversal algorithm that explores as deep as possible along each branch before backtracking using a Stack. Depth First Search requires a Stack and a Graph.
Dijkstra's Algorithm is a greedy shortest path algorithm that computes the minimum distance on weighted graphs with non-negative edge weights using a Priority Queue. Dijkstra's Algorithm depends on Graph and Heap data structures.
A Trie is a tree-like prefix search data structure used for efficient dictionary lookups and autocomplete.
A Hash Table is an associative data structure that maps keys to values using a Hash Function with constant-time average complexity. Hash Tables require Arrays and Linked Lists for collision resolution.`
  },
  {
    id: 'os_systems',
    title: 'Operating Systems & Concurrency',
    category: 'Systems Architecture',
    text: `A Process is an instance of a computer program that is being executed by the operating system.
A Thread is a lightweight unit of CPU execution within a process, sharing the same address space. Threads require Processes.
CPU Scheduling allocates processor time to active threads using scheduling algorithms like Round Robin and Priority Scheduling. CPU Scheduling depends on Queues and Priority Queues.
Virtual Memory is a memory management capability that provides an idealized abstraction of storage resources. Virtual Memory requires understanding of Physical Memory and Paging.
Paging is a memory management scheme that eliminates the need for contiguous allocation of physical memory. Paging is foundational to Virtual Memory.
A Mutex is a synchronization primitive used to prevent concurrent access to shared resources. A Mutex requires understanding of Concurrency and Race Conditions.
A Semaphore is a signaling mechanism that regulates access to a finite number of shared resources. Semaphores depend on Mutexes and Queues.
A Deadlock is a state in which each member of a group waits for another member to take action. Deadlock analysis uses Directed Graphs and Cycle Detection algorithms.`
  },
  {
    id: 'graph_theory',
    title: 'Graph Theory & Network Flows',
    category: 'Theoretical CS',
    text: `A Directed Acyclic Graph is a finite directed graph with no directed cycles. Directed Acyclic Graphs are essential for task dependency modeling.
Topological Sorting is a linear ordering of vertices in a Directed Acyclic Graph such that every directed edge uv has u coming before v. Topological Sorting requires a Directed Acyclic Graph and In-Degree Queues.
Kahn's Algorithm is a topological sorting method based on tracking vertex in-degrees and processing zero in-degree nodes. Kahn's Algorithm depends on Topological Sorting and Queues.
A Minimum Spanning Tree is a subset of edges that connects all vertices in an undirected weighted graph with minimum total edge weight. Minimum Spanning Trees depend on Graphs.
Kruskal's Algorithm finds a Minimum Spanning Tree by greedily selecting the lowest weight edges using a Disjoint Set Union data structure. Kruskal's Algorithm requires Disjoint Set Union and Sorting.
Prim's Algorithm finds a Minimum Spanning Tree by growing a single tree from a start vertex using a Min-Heap. Prim's Algorithm depends on Graphs and Priority Queues.`
  }
];
