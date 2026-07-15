package collaboration

import (
	"encoding/json"
	"errors"
)

var (
	ErrUnknownClient          = errors.New("unknown client")
	ErrSeedExists             = errors.New("seed already exists")
	ErrLockRequired           = errors.New("seed is not locked by this client")
	ErrSeedNotFound           = errors.New("seed not found")
	ErrSeedInvalid            = errors.New("invalid seed")
	ErrLockConflict           = errors.New("seed is locked by another client")
	ErrRelationshipNotFound   = errors.New("relationship not found")
	ErrRelationshipInvalid    = errors.New("invalid relationship")
	ErrDomainNotFound         = errors.New("domain not found")
	ErrDomainExists           = errors.New("domain already exists")
	ErrDomainInvalid          = errors.New("invalid domain")
	ErrDomainInUse            = errors.New("domain is assigned to a field")
	ErrCategoryNotFound       = errors.New("domain category not found")
	ErrCategoryExists         = errors.New("domain category already exists")
	ErrCategoryInvalid        = errors.New("invalid domain category")
	ErrNamingPolicyInvalid    = errors.New("invalid naming policy")
	ErrVocabularyNotFound     = errors.New("vocabulary entry not found")
	ErrVocabularyExists       = errors.New("vocabulary term is already defined")
	ErrVocabularyInvalid      = errors.New("invalid vocabulary entry")
	ErrCanvasNotFound         = errors.New("canvas not found")
	ErrCanvasExists           = errors.New("canvas already exists")
	ErrCanvasInvalid          = errors.New("invalid canvas")
	ErrPlacementNotFound      = errors.New("model placement not found")
	ErrPlacementExists        = errors.New("model placement already exists")
	ErrPlacementInvalid       = errors.New("invalid model placement")
	ErrReadonlyPlacement      = errors.New("model placement is readonly")
	ErrOwnershipChanged       = errors.New("model ownership changed")
	ErrDFDInvalid             = errors.New("invalid DFD state")
	ErrAnnotationNotFound     = errors.New("canvas annotation not found")
	ErrAnnotationExists       = errors.New("canvas annotation already exists")
	ErrAnnotationInvalid      = errors.New("invalid canvas annotation")
	ErrAnnotationEditConflict = errors.New("canvas annotation is being edited by another client")
)

const DefaultCanvasID = "main"
const DefaultDFDCanvasID = "dfd-main"

type Canvas struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type CanvasModelPlacement struct {
	CanvasID   string  `json:"canvasId"`
	SeedID     string  `json:"seedId"`
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	AccessMode string  `json:"accessMode"`
}

type ModelSeed struct {
	ID                string             `json:"id"`
	Title             string             `json:"title"`
	Names             *NameSet           `json:"names,omitempty"`
	VocabularyBinding *VocabularyBinding `json:"vocabularyBinding,omitempty"`
	Description       string             `json:"description"`
	Fields            []ModelField       `json:"fields"`
	X                 float64            `json:"x"`
	Y                 float64            `json:"y"`
	Role              string             `json:"role"`
	Dependency        string             `json:"dependency"`
	UsageScope        string             `json:"usageScope,omitempty"`
	HasPrivacy        bool               `json:"hasPrivacy"`
	MaturedLevel      float64            `json:"maturedLevel"`
	Rotation          float64            `json:"rotation"`
	Indexes           []IndexDefinition  `json:"indexes,omitempty"`
	Partitioning      *PartitionScheme   `json:"partitioning,omitempty"`
	VolumeEstimate    *VolumeEstimate    `json:"volumeEstimate,omitempty"`
	AdditionalSQL     string             `json:"additionalSql,omitempty"`
}

type DFDCanvas struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type DFDNode struct {
	ID                string               `json:"id"`
	DefinitionID      string               `json:"definitionId"`
	CanvasID          string               `json:"canvasId"`
	Kind              string               `json:"kind"`
	Name              string               `json:"name"`
	Description       string               `json:"description,omitempty"`
	X                 float64              `json:"x"`
	Y                 float64              `json:"y"`
	ProcessKind       string               `json:"processKind,omitempty"`
	PhysicalProcesses []DFDPhysicalProcess `json:"physicalProcesses,omitempty"`
	ModelID           string               `json:"modelId,omitempty"`
	IntermediateKind  string               `json:"intermediateKind,omitempty"`
	Format            string               `json:"format,omitempty"`
}

type DFDPhysicalProcess struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (p *DFDPhysicalProcess) UnmarshalJSON(data []byte) error {
	var legacy string
	if err := json.Unmarshal(data, &legacy); err == nil {
		p.Name = legacy
		return nil
	}
	type plain DFDPhysicalProcess
	return json.Unmarshal(data, (*plain)(p))
}

type DFDCRUDAssignment struct {
	ProcessUnitID string   `json:"processUnitId"`
	ModelID       string   `json:"modelId"`
	Operations    []string `json:"operations"`
}

type DFDFlow struct {
	ID              string              `json:"id"`
	CanvasID        string              `json:"canvasId"`
	SourceID        string              `json:"sourceId"`
	DestinationID   string              `json:"destinationId"`
	Label           string              `json:"label,omitempty"`
	Protocol        string              `json:"protocol,omitempty"`
	Bidirectional   bool                `json:"bidirectional,omitempty"`
	CRUDAssignments []DFDCRUDAssignment `json:"crudAssignments,omitempty"`
	// Legacy fields are accepted and removed by normalization.
	SourceCRUD      string   `json:"sourceCrud,omitempty"`
	DestinationCRUD []string `json:"destinationCrud,omitempty"`
}

type DFDCRUDMatrix struct {
	Orientation  string   `json:"orientation"`
	ProcessOrder []string `json:"processOrder"`
	ModelOrder   []string `json:"modelOrder"`
}

type DFDGroup struct {
	ID        string   `json:"id"`
	CanvasID  string   `json:"canvasId"`
	Kind      string   `json:"kind"`
	MemberIDs []string `json:"memberIds"`
}

type DFDState struct {
	Canvases   []DFDCanvas   `json:"canvases"`
	Nodes      []DFDNode     `json:"nodes"`
	Flows      []DFDFlow     `json:"flows"`
	Groups     []DFDGroup    `json:"groups"`
	CRUDMatrix DFDCRUDMatrix `json:"crudMatrix"`
}

type ModelField struct {
	ID                string             `json:"id"`
	Name              string             `json:"name"`
	Names             *NameSet           `json:"names,omitempty"`
	VocabularyBinding *VocabularyBinding `json:"vocabularyBinding,omitempty"`
	PrimaryKey        bool               `json:"primaryKey"`
	Important         bool               `json:"important"`
	DomainID          string             `json:"domainId,omitempty"`
	UseDomainName     bool               `json:"useDomainName,omitempty"`
	Required          bool               `json:"required,omitempty"`
	Unique            bool               `json:"unique,omitempty"`
	DefaultValue      *ColumnDefault     `json:"defaultValue,omitempty"`
	ValueGeneration   string             `json:"valueGeneration,omitempty"`
	AverageSizeBytes  *float64           `json:"estimatedAverageSizeBytes,omitempty"`
}

type ColumnDefault struct {
	Kind  string `json:"kind"`
	Value string `json:"value,omitempty"`
}

type IndexKey struct {
	Source      string `json:"source"`
	SourceID    string `json:"sourceId"`
	ComponentID string `json:"componentId,omitempty"`
	Direction   string `json:"direction"`
}

type IndexDefinition struct {
	ID     string     `json:"id"`
	Name   string     `json:"name"`
	Unique bool       `json:"unique"`
	Keys   []IndexKey `json:"keys"`
}

type PartitionKey struct {
	FieldID     string `json:"fieldId"`
	ComponentID string `json:"componentId,omitempty"`
}

type PartitionBound struct {
	Kind  string `json:"kind"`
	Value string `json:"value,omitempty"`
}

type PartitionRange struct {
	ID   string           `json:"id"`
	Name string           `json:"name"`
	From []PartitionBound `json:"from"`
	To   []PartitionBound `json:"to"`
}

type PartitionScheme struct {
	Strategy string           `json:"strategy"`
	Keys     []PartitionKey   `json:"keys"`
	Ranges   []PartitionRange `json:"ranges"`
}

type GrowthRate struct {
	Amount float64 `json:"amount"`
	Period string  `json:"period"`
}

type RetentionPeriod struct {
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

type VolumeEstimate struct {
	InitialRecordCount float64          `json:"initialRecordCount"`
	GrowthRate         GrowthRate       `json:"growthRate"`
	RetentionPeriod    *RetentionPeriod `json:"retentionPeriod,omitempty"`
	MaximumRecordCount *float64         `json:"maximumRecordCount,omitempty"`
}

type NameSet struct {
	Business string `json:"business"`
	System   string `json:"system"`
	Physical string `json:"physical"`
}

type VocabularySegment struct {
	Type    string `json:"type"`
	EntryID string `json:"entryId,omitempty"`
	Source  string `json:"source,omitempty"`
	Text    string `json:"text,omitempty"`
}

type VocabularyBinding struct {
	SourceText string              `json:"sourceText"`
	Segments   []VocabularySegment `json:"segments"`
	Manual     bool                `json:"manual"`
}

type VocabularyEntry struct {
	ID           string   `json:"id"`
	BusinessName string   `json:"businessName"`
	SystemName   string   `json:"systemName"`
	PhysicalName string   `json:"physicalName"`
	Meaning      string   `json:"meaning"`
	Memo         string   `json:"memo"`
	Aliases      []string `json:"aliases"`
}

type DomainComponent struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DomainID     string `json:"domainId,omitempty"`
	Required     bool   `json:"required"`
	Description  string `json:"description,omitempty"`
	PartitionKey bool   `json:"partitionKey,omitempty"`
}

type CodeSetEntry struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Value string `json:"value"`
}

type DataDomain struct {
	ID                string             `json:"id"`
	Name              string             `json:"name"`
	Names             *NameSet           `json:"names,omitempty"`
	VocabularyBinding *VocabularyBinding `json:"vocabularyBinding,omitempty"`
	CategoryID        string             `json:"categoryId"`
	Shape             string             `json:"shape"`
	PrimitiveType     string             `json:"primitiveType,omitempty"`
	Bits              int                `json:"bits,omitempty"`
	Unsigned          bool               `json:"unsigned,omitempty"`
	Length            int                `json:"length,omitempty"`
	Precision         int                `json:"precision,omitempty"`
	Scale             int                `json:"scale,omitempty"`
	CodeSetBaseType   string             `json:"codeSetBaseType,omitempty"`
	CodeSetEntries    []CodeSetEntry     `json:"codeSetEntries,omitempty"`
	Components        []DomainComponent  `json:"components"`
	PartitionKey      bool               `json:"partitionKey,omitempty"`
	System            bool               `json:"system,omitempty"`
}

type DomainCategory struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	System bool   `json:"system,omitempty"`
}

type NamingPolicy struct {
	TablePluralization string `json:"tablePluralization"`
	TableJoinMode      string `json:"tableJoinMode"`
	TableSeparator     string `json:"tableSeparator"`
	FieldJoinMode      string `json:"fieldJoinMode"`
	FieldSeparator     string `json:"fieldSeparator"`
	DomainJoinMode     string `json:"domainJoinMode"`
	DomainSeparator    string `json:"domainSeparator"`
}

type Relationship struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	SourceID           string `json:"sourceId"`
	TargetID           string `json:"targetId"`
	SourceMultiplicity string `json:"sourceMultiplicity"`
	TargetMultiplicity string `json:"targetMultiplicity"`
	Direction          string `json:"direction"`
	Kind               string `json:"kind"`
	OnDelete           string `json:"onDelete,omitempty"`
}

type RelationshipReference struct {
	ID               string   `json:"id"`
	RelationshipID   string   `json:"relationshipId"`
	PrimaryKey       bool     `json:"primaryKey"`
	ForeignKey       bool     `json:"foreignKey"`
	HiddenOnModelIDs []string `json:"hiddenOnModelIds"`
}

type Collaborator struct {
	ID                  string  `json:"id"`
	Name                string  `json:"name"`
	Color               string  `json:"color"`
	X                   float64 `json:"x"`
	Y                   float64 `json:"y"`
	Online              bool    `json:"online"`
	CanvasID            string  `json:"canvasId"`
	CanvasType          string  `json:"canvasType,omitempty"`
	SelectionID         string  `json:"selectionId,omitempty"`
	EditingAnnotationID string  `json:"editingAnnotationId,omitempty"`
}

type CanvasPoint struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type AnnotationAnchor struct {
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	ItemID   string  `json:"itemId,omitempty"`
	ItemKind string  `json:"itemKind,omitempty"`
}

type CanvasAnnotation struct {
	ID          string            `json:"id"`
	CanvasType  string            `json:"canvasType"`
	CanvasID    string            `json:"canvasId"`
	Kind        string            `json:"kind"`
	X           float64           `json:"x,omitempty"`
	Y           float64           `json:"y,omitempty"`
	Width       float64           `json:"width,omitempty"`
	Height      float64           `json:"height,omitempty"`
	Points      []CanvasPoint     `json:"points,omitempty"`
	Start       *AnnotationAnchor `json:"start,omitempty"`
	End         *AnnotationAnchor `json:"end,omitempty"`
	Text        string            `json:"text,omitempty"`
	Color       string            `json:"color"`
	Fill        string            `json:"fill,omitempty"`
	StrokeWidth float64           `json:"strokeWidth"`
	Layer       string            `json:"layer"`
	ZIndex      int               `json:"zIndex,omitempty"`
	CreatedBy   string            `json:"createdBy"`
	UpdatedBy   string            `json:"updatedBy"`
}

type State struct {
	Canvases               []Canvas                `json:"canvases"`
	Placements             []CanvasModelPlacement  `json:"placements"`
	Seeds                  []ModelSeed             `json:"seeds"`
	Relationships          []Relationship          `json:"relationships"`
	RelationshipReferences []RelationshipReference `json:"relationshipReferences"`
	Domains                []DataDomain            `json:"domains"`
	DomainCategories       []DomainCategory        `json:"domainCategories"`
	NamingPolicy           NamingPolicy            `json:"namingPolicy"`
	VocabularyEntries      []VocabularyEntry       `json:"vocabularyEntries"`
	DFD                    DFDState                `json:"dfd"`
	Users                  []Collaborator          `json:"users"`
	Locks                  map[string]Collaborator `json:"locks"`
	Annotations            []CanvasAnnotation      `json:"annotations"`
}

type AnnotationUpdate struct {
	User       Collaborator
	Annotation CanvasAnnotation
	Created    bool
	Deleted    bool
}

type CanvasUpdate struct {
	User    Collaborator
	Canvas  Canvas
	Created bool
}

type PlacementUpdate struct {
	User      Collaborator
	Placement CanvasModelPlacement
	Created   bool
}

type OwnershipTransfer struct {
	User            Collaborator
	SeedID          string
	PreviousOwnerID string
	TargetOwnerID   string
}

type JoinResult struct {
	State         State
	User          Collaborator
	AlreadyJoined bool
	Online        int
}

type UserUpdate struct {
	User         Collaborator
	PreviousName string
	Renamed      bool
}

type SeedUpdate struct {
	User    Collaborator
	Seed    ModelSeed
	Created bool
	Changes []string
}

type LockResult struct {
	User     Collaborator
	Owner    Collaborator
	Acquired bool
	Unlocked bool
}

type RelationshipUpdate struct {
	User         Collaborator
	Relationship Relationship
	Reference    RelationshipReference
	Created      bool
	Deleted      bool
}

type DomainUpdate struct {
	User    Collaborator
	Domain  DataDomain
	Created bool
	Deleted bool
}

type RefinementUpdate struct {
	User         Collaborator
	CreatedSeeds int
	Summary      []string
}

type CategoryUpdate struct {
	User     Collaborator
	Category DomainCategory
	Created  bool
}

type NamingPolicyUpdate struct {
	User   Collaborator
	Policy NamingPolicy
}

type VocabularyUpdate struct {
	User    Collaborator
	Entry   VocabularyEntry
	Created bool
	Deleted bool
}

type Departure struct {
	User          Collaborator
	ReleasedLocks int
}
