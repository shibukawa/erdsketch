package codegenjson

const SchemaID = "urn:erdsketch:schema:codegen:1"

// CanonicalDocumentSet is the JSON bridge envelope used by the export WASM boundary.
type CanonicalDocumentSet struct {
	FormatVersion int               `json:"formatVersion"`
	ProjectID     string            `json:"projectId"`
	Documents     map[string]string `json:"documents"`
}

// ProjectState contains the semantic fields needed by export plus the original
// diagram layout. Transient editor state (users, locks, and viewports) is
// intentionally ignored by the codec.
type ProjectState struct {
	Canvases               []SourceERDCanvas             `json:"canvases"`
	Placements             []SourceCanvasModelPlacement  `json:"placements"`
	Seeds                  []SourceModel                 `json:"seeds"`
	Relationships          []SourceRelationship          `json:"relationships"`
	RelationshipReferences []SourceRelationshipReference `json:"relationshipReferences"`
	Domains                []SourceDomain                `json:"domains"`
	VocabularyEntries      []SourceVocabularyEntry       `json:"vocabularyEntries"`
	NamingPolicy           SourceNamingPolicy            `json:"namingPolicy"`
	DFD                    SourceDFDState                `json:"dfd"`
	Annotations            []SourceCanvasAnnotation      `json:"annotations"`
}

type SourceERDCanvas struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type SourceCanvasModelPlacement struct {
	CanvasID   string  `json:"canvasId"`
	SeedID     string  `json:"seedId"`
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	AccessMode string  `json:"accessMode"`
}

type SourceNamingPolicy struct {
	TablePluralization string `json:"tablePluralization"`
	TableJoinMode      string `json:"tableJoinMode"`
	TableSeparator     string `json:"tableSeparator"`
	FieldJoinMode      string `json:"fieldJoinMode"`
	FieldSeparator     string `json:"fieldSeparator"`
	DomainJoinMode     string `json:"domainJoinMode"`
	DomainSeparator    string `json:"domainSeparator"`
}

type Names struct {
	Business string `json:"business"`
	System   string `json:"system"`
	Physical string `json:"physical"`
}

type SourceModel struct {
	ID             string                  `json:"id"`
	Title          string                  `json:"title"`
	Names          Names                   `json:"names"`
	Description    string                  `json:"description"`
	Fields         []SourceField           `json:"fields"`
	Role           string                  `json:"role"`
	Dependency     string                  `json:"dependency"`
	UsageScope     string                  `json:"usageScope"`
	HasPrivacy     bool                    `json:"hasPrivacy"`
	Indexes        []SourceIndexDefinition `json:"indexes"`
	Partitioning   SourcePartitionScheme   `json:"partitioning"`
	VolumeEstimate SourceVolumeEstimate    `json:"volumeEstimate"`
	AdditionalSQL  string                  `json:"additionalSql"`
	X              float64                 `json:"x"`
	Y              float64                 `json:"y"`
	Rotation       float64                 `json:"rotation"`
	MaturedLevel   float64                 `json:"maturedLevel"`
}

type SourceField struct {
	ID                        string              `json:"id"`
	Name                      string              `json:"name"`
	Names                     Names               `json:"names"`
	PrimaryKey                bool                `json:"primaryKey"`
	Important                 bool                `json:"important"`
	DomainID                  string              `json:"domainId"`
	UseDomainName             bool                `json:"useDomainName"`
	Required                  bool                `json:"required"`
	Unique                    bool                `json:"unique"`
	DefaultValue              SourceColumnDefault `json:"defaultValue"`
	ValueGeneration           string              `json:"valueGeneration"`
	EstimatedAverageSizeBytes float64             `json:"estimatedAverageSizeBytes"`
}

type SourceVolumeEstimate struct {
	InitialRecordCount int                   `json:"initialRecordCount"`
	GrowthRate         SourceGrowthRate      `json:"growthRate"`
	RetentionPeriod    SourceRetentionPeriod `json:"retentionPeriod"`
	MaximumRecordCount int                   `json:"maximumRecordCount"`
}

type SourceGrowthRate struct {
	Amount int    `json:"amount"`
	Period string `json:"period"`
}

type SourceRetentionPeriod struct {
	Value int    `json:"value"`
	Unit  string `json:"unit"`
}

type SourceColumnDefault struct {
	Kind  string `json:"kind"`
	Value string `json:"value"`
}

type SourceIndexDefinition struct {
	ID     string           `json:"id"`
	Name   string           `json:"name"`
	Unique bool             `json:"unique"`
	Keys   []SourceIndexKey `json:"keys"`
}

type SourceIndexKey struct {
	Source      string `json:"source"`
	SourceID    string `json:"sourceId"`
	ComponentID string `json:"componentId"`
	Direction   string `json:"direction"`
}

type SourcePartitionScheme struct {
	Strategy string                 `json:"strategy"`
	Keys     []SourcePartitionKey   `json:"keys"`
	Ranges   []SourcePartitionRange `json:"ranges"`
}

type SourcePartitionKey struct {
	FieldID     string `json:"fieldId"`
	ComponentID string `json:"componentId"`
}

type SourcePartitionRange struct {
	ID   string                 `json:"id"`
	Name string                 `json:"name"`
	From []SourcePartitionBound `json:"from"`
	To   []SourcePartitionBound `json:"to"`
}

type SourcePartitionBound struct {
	Kind  string `json:"kind"`
	Value string `json:"value"`
}

type SourceDomain struct {
	ID              string                  `json:"id"`
	Name            string                  `json:"name"`
	Names           Names                   `json:"names"`
	CategoryID      string                  `json:"categoryId"`
	Shape           string                  `json:"shape"`
	PrimitiveType   string                  `json:"primitiveType"`
	Bits            int                     `json:"bits"`
	Unsigned        bool                    `json:"unsigned"`
	Length          int                     `json:"length"`
	Precision       int                     `json:"precision"`
	Scale           int                     `json:"scale"`
	CodeSetBaseType string                  `json:"codeSetBaseType"`
	CodeSetEntries  []SourceCodeSetEntry    `json:"codeSetEntries"`
	Components      []SourceDomainComponent `json:"components"`
	PartitionKey    bool                    `json:"partitionKey"`
	System          bool                    `json:"system"`
}

type SourceDomainComponent struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DomainID     string `json:"domainId"`
	Required     bool   `json:"required"`
	Description  string `json:"description"`
	PartitionKey bool   `json:"partitionKey"`
}

type SourceCodeSetEntry struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Value string `json:"value"`
}

type SourceVocabularyEntry struct {
	ID           string   `json:"id"`
	BusinessName string   `json:"businessName"`
	SystemName   string   `json:"systemName"`
	PhysicalName string   `json:"physicalName"`
	Meaning      string   `json:"meaning"`
	Memo         string   `json:"memo"`
	Aliases      []string `json:"aliases"`
}

type SourceRelationship struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	SourceID           string `json:"sourceId"`
	TargetID           string `json:"targetId"`
	SourceMultiplicity string `json:"sourceMultiplicity"`
	TargetMultiplicity string `json:"targetMultiplicity"`
	Direction          string `json:"direction"`
	Kind               string `json:"kind"`
	OnDelete           string `json:"onDelete"`
}

type SourceRelationshipReference struct {
	ID               string   `json:"id"`
	RelationshipID   string   `json:"relationshipId"`
	PrimaryKey       bool     `json:"primaryKey"`
	ForeignKey       bool     `json:"foreignKey"`
	HiddenOnModelIDs []string `json:"hiddenOnModelIds"`
}

type SourceDFDState struct {
	Canvases   []SourceDFDCanvas `json:"canvases"`
	Nodes      []SourceDFDNode   `json:"nodes"`
	Flows      []SourceDFDFlow   `json:"flows"`
	Groups     []SourceDFDGroup  `json:"groups"`
	CRUDMatrix SourceCRUDMatrix  `json:"crudMatrix"`
}

type SourceDFDCanvas struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type SourceDFDNode struct {
	ID                string                     `json:"id"`
	DefinitionID      string                     `json:"definitionId"`
	CanvasID          string                     `json:"canvasId"`
	Kind              string                     `json:"kind"`
	Name              string                     `json:"name"`
	Description       string                     `json:"description"`
	X                 float64                    `json:"x"`
	Y                 float64                    `json:"y"`
	ProcessKind       string                     `json:"processKind"`
	PhysicalProcesses []SourceDFDPhysicalProcess `json:"physicalProcesses"`
	ModelID           string                     `json:"modelId"`
	IntermediateKind  string                     `json:"intermediateKind"`
	Format            string                     `json:"format"`
}

type SourceDFDGroup struct {
	ID        string   `json:"id"`
	CanvasID  string   `json:"canvasId"`
	Kind      string   `json:"kind"`
	MemberIDs []string `json:"memberIds"`
}

type SourceCRUDMatrix struct {
	Orientation  string   `json:"orientation"`
	ProcessOrder []string `json:"processOrder"`
	ModelOrder   []string `json:"modelOrder"`
}

type SourceDFDPhysicalProcess struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type SourceDFDFlow struct {
	ID              string                 `json:"id"`
	CanvasID        string                 `json:"canvasId"`
	SourceID        string                 `json:"sourceId"`
	DestinationID   string                 `json:"destinationId"`
	Label           string                 `json:"label"`
	Protocol        string                 `json:"protocol"`
	Bidirectional   bool                   `json:"bidirectional"`
	CRUDAssignments []SourceCRUDAssignment `json:"crudAssignments"`
}

type SourceCRUDAssignment struct {
	ProcessUnitID string   `json:"processUnitId"`
	ModelID       string   `json:"modelId"`
	Operations    []string `json:"operations"`
}

type SourceCanvasPoint struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type SourceAnnotationStroke struct {
	Points []SourceCanvasPoint `json:"points"`
}

type SourceAnnotationAnchor struct {
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	ItemID   string  `json:"itemId"`
	ItemKind string  `json:"itemKind"`
}

type SourceCanvasAnnotation struct {
	ID          string                   `json:"id"`
	CanvasType  string                   `json:"canvasType"`
	CanvasID    string                   `json:"canvasId"`
	Kind        string                   `json:"kind"`
	X           float64                  `json:"x"`
	Y           float64                  `json:"y"`
	Width       float64                  `json:"width"`
	Height      float64                  `json:"height"`
	Points      []SourceCanvasPoint      `json:"points"`
	Strokes     []SourceAnnotationStroke `json:"strokes"`
	Start       SourceAnnotationAnchor   `json:"start"`
	End         SourceAnnotationAnchor   `json:"end"`
	Text        string                   `json:"text"`
	Color       string                   `json:"color"`
	Fill        string                   `json:"fill"`
	StrokeWidth float64                  `json:"strokeWidth"`
	Layer       string                   `json:"layer"`
	ZIndex      int                      `json:"zIndex"`
}

type ExchangeDocument struct {
	Schema          string                    `json:"$schema"`
	FormatVersion   int                       `json:"formatVersion"`
	Project         ExchangeProject           `json:"project"`
	Models          []ExchangeModel           `json:"models"`
	Domains         []ExchangeDomain          `json:"domains"`
	Vocabulary      []ExchangeVocabularyEntry `json:"vocabulary"`
	Relationships   []ExchangeRelationship    `json:"relationships"`
	Processes       []ExchangeProcess         `json:"processes"`
	DataFlows       []ExchangeDataFlow        `json:"dataFlows"`
	CRUDAssignments []ExchangeCRUDAssignment  `json:"crudAssignments"`
}

type ExchangeProject struct {
	ID string `json:"id"`
}

type ExchangeModel struct {
	ID              string                   `json:"id"`
	Names           Names                    `json:"names"`
	Description     string                   `json:"description"`
	Role            string                   `json:"role"`
	UsageScope      string                   `json:"usageScope"`
	Fields          []ExchangeField          `json:"fields"`
	PhysicalColumns []ExchangePhysicalColumn `json:"physicalColumns"`
	Indexes         []SourceIndexDefinition  `json:"indexes"`
	Partitioning    SourcePartitionScheme    `json:"partitioning"`
	AdditionalSQL   string                   `json:"additionalSql"`
}

type ExchangeField struct {
	ID              string              `json:"id"`
	Names           Names               `json:"names"`
	PrimaryKey      bool                `json:"primaryKey"`
	Important       bool                `json:"important"`
	DomainID        string              `json:"domainId"`
	Required        bool                `json:"required"`
	Unique          bool                `json:"unique"`
	DefaultValue    SourceColumnDefault `json:"defaultValue"`
	ValueGeneration string              `json:"valueGeneration"`
}

type ExchangePhysicalColumn struct {
	ID            string `json:"id"`
	SourceFieldID string `json:"sourceFieldId"`
	DomainID      string `json:"domainId"`
	ComponentID   string `json:"componentId"`
	Names         Names  `json:"names"`
	PrimitiveType string `json:"primitiveType"`
	Required      bool   `json:"required"`
	PrimaryKey    bool   `json:"primaryKey"`
	Unique        bool   `json:"unique"`
	Resolved      bool   `json:"resolved"`
}

type ExchangeDomain struct {
	ID              string                  `json:"id"`
	Names           Names                   `json:"names"`
	CategoryID      string                  `json:"categoryId"`
	Shape           string                  `json:"shape"`
	PrimitiveType   string                  `json:"primitiveType"`
	Bits            int                     `json:"bits"`
	Unsigned        bool                    `json:"unsigned"`
	Length          int                     `json:"length"`
	Precision       int                     `json:"precision"`
	Scale           int                     `json:"scale"`
	CodeSetBaseType string                  `json:"codeSetBaseType"`
	CodeSetEntries  []SourceCodeSetEntry    `json:"codeSetEntries"`
	Components      []SourceDomainComponent `json:"components"`
	PartitionKey    bool                    `json:"partitionKey"`
	System          bool                    `json:"system"`
}

type ExchangeVocabularyEntry struct {
	ID      string   `json:"id"`
	Names   Names    `json:"names"`
	Meaning string   `json:"meaning"`
	Memo    string   `json:"memo"`
	Aliases []string `json:"aliases"`
}

type ExchangeRelationship struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	SourceID           string `json:"sourceId"`
	TargetID           string `json:"targetId"`
	SourceMultiplicity string `json:"sourceMultiplicity"`
	TargetMultiplicity string `json:"targetMultiplicity"`
	Direction          string `json:"direction"`
	Kind               string `json:"kind"`
	OnDelete           string `json:"onDelete"`
	ReferenceID        string `json:"referenceId"`
	PrimaryKey         bool   `json:"primaryKey"`
	ForeignKey         bool   `json:"foreignKey"`
	OwnerModelID       string `json:"ownerModelId"`
	ChildModelID       string `json:"childModelId"`
}

type ExchangeProcess struct {
	ID                string                     `json:"id"`
	Name              string                     `json:"name"`
	Description       string                     `json:"description"`
	Kind              string                     `json:"kind"`
	PhysicalProcesses []SourceDFDPhysicalProcess `json:"physicalProcesses"`
}

type ExchangeDataFlow struct {
	ID            string `json:"id"`
	CanvasID      string `json:"canvasId"`
	SourceID      string `json:"sourceId"`
	DestinationID string `json:"destinationId"`
	Label         string `json:"label"`
	Protocol      string `json:"protocol"`
	Bidirectional bool   `json:"bidirectional"`
}

type ExchangeCRUDAssignment struct {
	FlowID        string   `json:"flowId"`
	ProcessUnitID string   `json:"processUnitId"`
	ModelID       string   `json:"modelId"`
	Operations    []string `json:"operations"`
}

type MarkdownOptions struct {
	NameMode               string `json:"nameMode"`
	ModelCardContent       string `json:"modelCardContent"`
	GeneratedAt            string `json:"generatedAt"`
	SourceSnapshotRevision string `json:"sourceSnapshotRevision"`
}

type SQLExportOptions struct {
	Dialects []string `json:"dialects"`
	ModelIDs []string `json:"modelIds"`
}

type ExportArtifact struct {
	Path      string `json:"path"`
	MediaType string `json:"mediaType"`
	Content   string `json:"content"`
}

type DiagnosticTarget struct {
	Kind           string `json:"kind"`
	ModelID        string `json:"modelId"`
	FieldID        string `json:"fieldId"`
	DomainID       string `json:"domainId"`
	RelationshipID string `json:"relationshipId"`
}

type ExportDiagnostic struct {
	Severity     string           `json:"severity"`
	Code         string           `json:"code"`
	Message      string           `json:"message"`
	ExportMode   string           `json:"exportMode"`
	ArtifactID   string           `json:"artifactId"`
	SourceKind   string           `json:"sourceKind"`
	SourceID     string           `json:"sourceId"`
	SourcePath   string           `json:"sourcePath"`
	CanvasID     string           `json:"canvasId"`
	EditorTarget string           `json:"editorTarget"`
	SuggestedFix string           `json:"suggestedFix"`
	Target       DiagnosticTarget `json:"target"`
}

type ExportResult struct {
	Artifacts   []ExportArtifact   `json:"artifacts"`
	Diagnostics []ExportDiagnostic `json:"diagnostics"`
}
