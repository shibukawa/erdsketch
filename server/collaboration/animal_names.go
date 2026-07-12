package collaboration

import (
	"fmt"
	"math/rand/v2"
	"strings"
)

var animalNames = []string{
	"Alpaca", "Badger", "Bear", "Beaver", "Bison", "Bobcat", "Capybara", "Caracal",
	"Cat", "Cheetah", "Coati", "Coyote", "Deer", "Dolphin", "Eagle", "Falcon",
	"Ferret", "Fox", "Gazelle", "Giraffe", "Hedgehog", "Heron", "Jaguar", "Koala",
	"Lemur", "Leopard", "Lion", "Lynx", "Marten", "Meerkat", "Moose", "Narwhal",
	"Ocelot", "Orca", "Otter", "Owl", "Panda", "Panther", "Penguin", "Puma",
	"Rabbit", "Raccoon", "Red Panda", "Seal", "Sloth", "Squirrel", "Tiger", "Toucan",
	"Turtle", "Wallaby", "Weasel", "Wolf", "Wombat", "Yak", "Zebra",
}

func availableAnimalName(users map[string]Collaborator) string {
	used := make(map[string]struct{}, len(users))
	for _, user := range users {
		used[strings.ToLower(strings.TrimSpace(user.Name))] = struct{}{}
	}
	available := make([]string, 0, len(animalNames))
	for _, name := range animalNames {
		if _, exists := used[strings.ToLower(name)]; !exists {
			available = append(available, name)
		}
	}
	if len(available) > 0 {
		return available[rand.IntN(len(available))]
	}
	for suffix := 2; ; suffix++ {
		candidate := fmt.Sprintf("Animal %d", suffix)
		if _, exists := used[strings.ToLower(candidate)]; !exists {
			return candidate
		}
	}
}
