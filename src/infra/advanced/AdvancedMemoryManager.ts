import {MemoryManager} from "../../application/MemoryManager";
import {MemoryGraph} from "./SemanticMemoryGraph";
import {DualMemorySystem} from "./Episodic";
import {WorkingMemory} from "./WorkingMemory";
import {ImportanceScorer, MLImportanceScorer} from "./Importance";
import {ContradictionDetector} from "./ContradictionDetector";
import {HierarchicalMemoryOrganizer} from "./OrganizeMemories";
import {VersionedMemory} from "./MemoryVersioning";
import {ConsolidationStrategy, TemporalConsolidation} from "./Consolication";
import {MemoryConfig} from "../../application/config/MemoryConfig";
import {MemoryItem, MemoryItemInput} from "../../domain/models/MemoryItem";

export class AdvancedMemoryManager extends MemoryManager {
    private graph: MemoryGraph;
    private dualSystem: DualMemorySystem;
    private workingMemory: WorkingMemory;
    private importanceScorer: ImportanceScorer;
    private contradictionDetector: ContradictionDetector;
    private hierarchyOrganizer: HierarchicalMemoryOrganizer;
    private versionControl: VersionedMemory;
    private consolidation: ConsolidationStrategy;

    constructor(config: MemoryConfig & {
        enableGraph?: boolean;
        enableDualMemory?: boolean;
        enableWorkingMemory?: boolean;
        enableImportanceScoring?: boolean;
        enableContradictionDetection?: boolean;
        enableHierarchy?: boolean;
        enableVersioning?: boolean;
        enableConsolidation?: boolean;
    }) {
        super(config);

        if (config.enableGraph && config.embedder) {
            this.graph = new MemoryGraph(config.embedder);
        }

        if (config.enableDualMemory && config.llm) {
            this.dualSystem = new DualMemorySystem(config.llm, config.storage);
        }

        if (config.enableWorkingMemory) {
            this.workingMemory = new WorkingMemory(10, config.storage);
        }

        if (config.enableImportanceScoring && config.llm) {
            this.importanceScorer = new MLImportanceScorer(config.llm);
        }

        if (config.enableContradictionDetection && config.llm && config.embedder) {
            this.contradictionDetector = new ContradictionDetector(
                config.llm,
                config.embedder
            );
        }

        if (config.enableHierarchy && config.llm) {
            this.hierarchyOrganizer = new HierarchicalMemoryOrganizer(config.llm);
        }

        if (config.enableVersioning) {
            this.versionControl = new VersionedMemory();
        }

        if (config.enableConsolidation && config.llm) {
            this.consolidation = new TemporalConsolidation(config.llm, {
                minMemories: 10,
                timeWindow: 24,
                similarityThreshold: 0.8
            });
        }
    }

    // Override remember with advanced features
    async remember(input: MemoryItemInput): Promise<MemoryItem> {
        const memory = await super.remember(input);

        // Score importance
        if (this.importanceScorer) {
            const importance = await this.importanceScorer.score(memory);
            memory.metadata = {
                ...memory.metadata,
                importance
            };
        }

        // Detect contradictions
        if (this.contradictionDetector) {
            const existing = await this.storage.getAll();
            const contradictions = await this.contradictionDetector.detectContradictions(
                memory,
                existing
            );

            if (contradictions.length > 0) {
                // Handle contradictions
                for (const contradiction of contradictions) {
                    const resolution = await this.contradictionDetector.resolveContradiction(
                        memory,
                        contradiction
                    );

                    if (resolution === 'keep_old') {
                        await this.storage.delete(memory.id);
                        return contradiction;
                    }
                }
            }
        }

        // Add to graph
        if (this.graph) {
            const existing = await this.storage.getAll();
            await this.graph.addMemory(memory, existing);
        }

        // Organize in hierarchy
        if (this.hierarchyOrganizer) {
            const categories = await this.hierarchyOrganizer.organize(memory);
            memory.metadata = {
                ...memory.metadata,
                categories
            };
        }

        // Add to working memory
        if (this.workingMemory) {
            await this.workingMemory.activate(memory);
        }

        return memory;
    }

    // Graph-enhanced recall
    async recallWithGraph(query: string, depth: number = 2): Promise<MemoryItem[]> {
        if (!this.graph) {
            return super.recall(query);
        }

        // Get initial results
        const initial = await super.recall(query, 3);

        // Expand using graph
        const relatedIds = new Set<string>();
        for (const mem of initial) {
            const related = this.graph.getRelatedMemories(mem.id, depth);
            related.forEach(id => relatedIds.add(id));
        }

        // Fetch all related memories
        const allMemories = await this.storage.getAll();
        const expanded = allMemories.filter(m =>
            relatedIds.has(m.id) || initial.some(i => i.id === m.id)
        );

        return expanded;
    }
}
