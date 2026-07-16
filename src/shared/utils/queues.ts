import type { Nullable } from '#shared/types/utils';
import { v4 as uuidv4 } from 'uuid';

export default class TaskQueues {
	private readonly queues: Map<string, TaskQueue>;

	public constructor() {
		this.queues = new Map();
	}

	public async run<T>(name: string, task: () => Promise<T>, label?: string): Promise<T> {
		const taskQueue = this.getQueue(name) ?? new TaskQueue(name);
		this.queues.set(name, taskQueue);
		return taskQueue.run(task, label);
	}

	public getQueue(name: string): Nullable<TaskQueue> {
		return this.queues.get(name) ?? null;
	}

	public getTask(label: string, queue?: string): Nullable<Task<void>> {
		if (typeof queue === 'string') {
			return this.getQueue(queue)?.getTask(label) ?? null;
		}
		let task: Nullable<Task<void>> = null;
		for (const taskQueue of this.queues.values()) {
			task = taskQueue.getTask(label);
			if (task) break;
		}
		return task;
	}

	public get isEmpty() {
		return [...this.queues.values()].every((queue) => queue.isEmpty);
	}
}

export class Task<T> extends Promise<T> {
	readonly id: string;
	readonly label: string;

	public constructor(promise: Promise<T>, label?: string) {
		super((resolve, reject) => {
			promise.then(resolve).catch(reject);
		});
		this.id = uuidv4();
		this.label = label ?? this.id;
	}

	static override get [Symbol.species]() {
		return Promise;
	}
}

export class TaskQueue {
	private readonly _name: string;
	private tail: Nullable<Task<void>>;
	private tasks: Map<string, Task<void>>;

	public constructor(name?: string) {
		this._name = name ?? uuidv4();
		this.tail = null;
		this.tasks = new Map();
	}

	public async run<T>(task: () => Promise<T>, label?: string): Promise<T> {
		// Retrieve previous task's promise, create a resolved one if none
		const previousTask = this.tail ?? Promise.resolve();
		let resolveCurrentTask = () => {};
		// Create a promise for the new task
		const currentTask = new Task(
			new Promise<void>((resolve) => {
				resolveCurrentTask = resolve;
			}),
			label
		);
		this.tasks.set(currentTask.id, currentTask);
		// Update the tail promise for the given key (stream)
		this.tail = currentTask;
		// Wait for the current task to complete before executing the new task
		await previousTask;
		// Now execute the new user task
		try {
			return await task();
		} finally {
			// Resolved or not, complete the current task
			resolveCurrentTask();
			// If no other tasks queued, clear the task queue for that key
			if (this.tail === currentTask) {
				this.tail = null;
			}
			this.tasks.delete(currentTask.id);
		}
	}

	public getTask(label: string): Nullable<Task<void>> {
		return this.tasks.get(label) ?? null;
	}

	public get name() {
		return this._name;
	}

	public get isEmpty() {
		return this.tail === null;
	}
}
