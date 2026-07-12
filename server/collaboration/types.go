package collaboration

import "errors"

var (
	ErrUnknownClient        = errors.New("unknown client")
	ErrSeedExists           = errors.New("seed already exists")
	ErrLockRequired         = errors.New("seed is not locked by this client")
	ErrSeedNotFound         = errors.New("seed not found")
	ErrLockConflict         = errors.New("seed is locked by another client")
	ErrRelationshipNotFound = errors.New("relationship not found")
	ErrRelationshipInvalid  = errors.New("invalid relationship")
	ErrDomainNotFound       = errors.New("domain not found")
	ErrDomainExists         = errors.New("domain already exists")
	ErrDomainInvalid        = errors.New("invalid domain")
	ErrDomainInUse          = errors.New("domain is assigned to a field")
	ErrCategoryNotFound     = errors.New("domain category not found")
	ErrCategoryExists       = errors.New("domain category already exists")
	ErrCategoryInvalid      = errors.New("invalid domain category")
)

type ModelSeed struct {
	ID           string       `json:"id"`
	Title        string       `json:"title"`
	Description  string       `json:"description"`
	Fields       []ModelField `json:"fields"`
	X            float64      `json:"x"`
	Y            float64      `json:"y"`
	Role         string       `json:"role"`
	Dependency   string       `json:"dependency"`
	HasPrivacy   bool         `json:"hasPrivacy"`
	MaturedLevel float64      `json:"maturedLevel"`
	Rotation     float64      `json:"rotation"`
}

type ModelField struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	PrimaryKey    bool   `json:"primaryKey"`
	Important     bool   `json:"important"`
	DomainID      string `json:"domainId,omitempty"`
	UseDomainName bool   `json:"useDomainName,omitempty"`
}

type DomainComponent struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DomainID     string `json:"domainId,omitempty"`
	Required     bool   `json:"required"`
	Description  string `json:"description,omitempty"`
	PartitionKey bool   `json:"partitionKey,omitempty"`
}

type DataDomain struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	CategoryID    string            `json:"categoryId"`
	Shape         string            `json:"shape"`
	PrimitiveType string            `json:"primitiveType,omitempty"`
	Bits          int               `json:"bits,omitempty"`
	Unsigned      bool              `json:"unsigned,omitempty"`
	Length        int               `json:"length,omitempty"`
	Precision     int               `json:"precision,omitempty"`
	Scale         int               `json:"scale,omitempty"`
	Components    []DomainComponent `json:"components"`
	PartitionKey  bool              `json:"partitionKey,omitempty"`
	System        bool              `json:"system,omitempty"`
}

type DomainCategory struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	System bool   `json:"system,omitempty"`
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
}

type RelationshipReference struct {
	ID               string   `json:"id"`
	RelationshipID   string   `json:"relationshipId"`
	PrimaryKey       bool     `json:"primaryKey"`
	ForeignKey       bool     `json:"foreignKey"`
	HiddenOnModelIDs []string `json:"hiddenOnModelIds"`
}

type Collaborator struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Color  string  `json:"color"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Online bool    `json:"online"`
}

type State struct {
	Seeds                  []ModelSeed             `json:"seeds"`
	Relationships          []Relationship          `json:"relationships"`
	RelationshipReferences []RelationshipReference `json:"relationshipReferences"`
	Domains                []DataDomain            `json:"domains"`
	DomainCategories       []DomainCategory        `json:"domainCategories"`
	Users                  []Collaborator          `json:"users"`
	Locks                  map[string]Collaborator `json:"locks"`
}

type JoinResult struct {
	State         State
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

type CategoryUpdate struct {
	User     Collaborator
	Category DomainCategory
	Created  bool
}

type Departure struct {
	User          Collaborator
	ReleasedLocks int
}
