import { describe, expect, it } from 'vitest'
import { MinHeap } from './minHeap.ts'

describe('MinHeap', () => {
  it('pops empty heap as undefined', () => {
    const heap = new MinHeap<string>()
    expect(heap.pop()).toBeUndefined()
    expect(heap.size).toBe(0)
  })

  it('pops the single pushed item', () => {
    const heap = new MinHeap<string>()
    heap.push(5, 'a')
    expect(heap.pop()).toBe('a')
    expect(heap.pop()).toBeUndefined()
  })

  it('pops items in ascending priority order regardless of push order', () => {
    const heap = new MinHeap<number>()
    const priorities = [5, 3, 8, 1, 9, 2, 7, 4, 6, 0]
    for (const p of priorities) heap.push(p, p)

    const popped: number[] = []
    while (heap.size > 0) popped.push(heap.pop()!)

    expect(popped).toEqual([...priorities].sort((a, b) => a - b))
  })

  it('handles duplicate priorities without losing any items', () => {
    const heap = new MinHeap<string>()
    heap.push(1, 'a')
    heap.push(1, 'b')
    heap.push(1, 'c')
    const popped = [heap.pop(), heap.pop(), heap.pop()]
    expect(popped.sort()).toEqual(['a', 'b', 'c'])
    expect(heap.pop()).toBeUndefined()
  })

  it('exercises both left and right child comparisons on sift-down', () => {
    // Push enough items that pop() must repeatedly choose between two children.
    const heap = new MinHeap<number>()
    const priorities = [10, 4, 15, 2, 8, 12, 20, 1, 6, 9, 11, 3]
    for (const p of priorities) heap.push(p, p)

    const popped: number[] = []
    while (heap.size > 0) popped.push(heap.pop()!)

    expect(popped).toEqual([...priorities].sort((a, b) => a - b))
  })

  it('tracks size correctly across interleaved pushes and pops', () => {
    const heap = new MinHeap<number>()
    heap.push(3, 3)
    heap.push(1, 1)
    expect(heap.size).toBe(2)
    heap.pop()
    expect(heap.size).toBe(1)
    heap.push(2, 2)
    expect(heap.size).toBe(2)
  })
})
